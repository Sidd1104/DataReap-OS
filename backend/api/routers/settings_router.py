"""
Settings Router — manage runtime application settings.
Settings are persisted in the database with optional encryption for secrets.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models.app_settings import AppSettingModel
from utils.encryption import decrypt, encrypt, safe_decrypt
from sources import list_available_sources
from core.prompt_manager import prompt_manager
from providers import get_provider

router = APIRouter(prefix="/api/settings", tags=["settings"])


class SettingUpsert(BaseModel):
    key: str
    value: str
    is_encrypted: bool = False
    description: Optional[str] = None
    category: str = "general"


class BulkSettingsUpdate(BaseModel):
    settings: List[SettingUpsert]


@router.get("/")
async def get_all_settings(session: AsyncSession = Depends(get_db)):
    stmt = select(AppSettingModel).order_by(AppSettingModel.category, AppSettingModel.key)
    result = await session.execute(stmt)
    rows = result.scalars().all()
    return [
        {
            "key": r.key,
            "value": "***" if r.is_encrypted else r.value,
            "is_encrypted": r.is_encrypted,
            "description": r.description,
            "category": r.category,
            "updated_at": r.updated_at.isoformat(),
        }
        for r in rows
    ]


@router.get("/{key}")
async def get_setting(key: str, session: AsyncSession = Depends(get_db)):
    row = await session.get(AppSettingModel, key)
    if not row:
        raise HTTPException(status_code=404, detail=f"Setting {key!r} not found")
    value = safe_decrypt(row.value) if row.is_encrypted else row.value
    return {"key": key, "value": value, "category": row.category}


@router.put("/{key}")
async def upsert_setting(
    key: str,
    data: SettingUpsert,
    session: AsyncSession = Depends(get_db),
):
    stored_value = encrypt(data.value) if data.is_encrypted else data.value
    existing = await session.get(AppSettingModel, key)
    if existing:
        existing.value = stored_value
        existing.is_encrypted = data.is_encrypted
        if data.description:
            existing.description = data.description
        existing.category = data.category
    else:
        session.add(
            AppSettingModel(
                key=key,
                value=stored_value,
                is_encrypted=data.is_encrypted,
                description=data.description,
                category=data.category,
            )
        )
    return {"key": key, "saved": True}


@router.post("/bulk")
async def bulk_upsert_settings(
    data: BulkSettingsUpdate,
    session: AsyncSession = Depends(get_db),
):
    for setting in data.settings:
        stored_value = encrypt(setting.value) if setting.is_encrypted else setting.value
        existing = await session.get(AppSettingModel, setting.key)
        if existing:
            existing.value = stored_value
            existing.is_encrypted = setting.is_encrypted
            existing.category = setting.category
        else:
            session.add(
                AppSettingModel(
                    key=setting.key,
                    value=stored_value,
                    is_encrypted=setting.is_encrypted,
                    description=setting.description,
                    category=setting.category,
                )
            )
    return {"saved": len(data.settings)}


@router.delete("/{key}")
async def delete_setting(key: str, session: AsyncSession = Depends(get_db)):
    row = await session.get(AppSettingModel, key)
    if not row:
        raise HTTPException(status_code=404, detail="Setting not found")
    await session.delete(row)
    return {"deleted": True}


# ── Meta endpoints ────────────────────────────────────────────

@router.get("/meta/sources")
async def list_sources():
    return {"sources": list_available_sources()}


@router.get("/meta/providers")
async def list_providers():
    return {"providers": ["gemini", "openai", "anthropic"]}


@router.get("/meta/prompt-templates")
async def list_prompt_templates():
    return {"templates": prompt_manager.list_templates()}


@router.post("/meta/test-provider")
async def test_provider(provider_name: str, api_key: Optional[str] = None):
    try:
        provider = get_provider(provider_name, api_key=api_key)
        ok = await provider.test_connection()
        return {"provider": provider_name, "connected": ok}
    except Exception as exc:
        return {"provider": provider_name, "connected": False, "error": str(exc)}


@router.post("/meta/validate-prompt")
async def validate_prompt(template: str):
    return prompt_manager.validate_template(template)
