"""
Projects Router — CRUD for project configs.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.repositories.project_repository import ProjectRepository

router = APIRouter(prefix="/api/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    config: Dict[str, Any]


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    config: Dict[str, Any] | None = None
    is_active: bool | None = None


@router.get("/")
async def list_projects(session: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(session)
    projects = await repo.get_active()
    return [
        {
            "id": p.id,
            "name": p.name,
            "slug": p.slug,
            "description": p.description,
            "config": p.config,
            "is_active": p.is_active,
            "created_at": p.created_at.isoformat(),
        }
        for p in projects
    ]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_project(data: ProjectCreate, session: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(session)
    config = data.config
    config.setdefault("name", data.name)
    config.setdefault("description", data.description)
    project = await repo.upsert_from_config(config)
    return {"id": project.id, "slug": project.slug, "name": project.name}


@router.get("/{project_id}")
async def get_project(project_id: str, session: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(session)
    project = await repo.get_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {
        "id": project.id,
        "name": project.name,
        "slug": project.slug,
        "description": project.description,
        "config": project.config,
        "is_active": project.is_active,
        "created_at": project.created_at.isoformat(),
        "updated_at": project.updated_at.isoformat(),
    }


@router.put("/{project_id}")
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    session: AsyncSession = Depends(get_db),
):
    repo = ProjectRepository(session)
    project = await repo.get_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    project = await repo.update(project, **updates)
    return {"id": project.id, "name": project.name, "updated": True}


@router.delete("/{project_id}")
async def delete_project(project_id: str, session: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(session)
    project = await repo.get_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await repo.update(project, is_active=False)
    return {"deleted": True}


@router.get("/templates/list")
async def list_project_templates():
    """Return built-in project config templates."""
    templates_dir = Path("./projects")
    if not templates_dir.exists():
        return []

    templates = []
    for f in templates_dir.glob("*.json"):
        try:
            with open(f) as fp:
                config = json.load(fp)
                templates.append(
                    {
                        "filename": f.name,
                        "name": config.get("name", f.stem),
                        "description": config.get("description", ""),
                        "config": config,
                    }
                )
        except Exception:
            pass
    return templates
