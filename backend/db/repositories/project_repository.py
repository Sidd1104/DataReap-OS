"""
Project Repository — domain-specific queries for Project entities.
"""
from __future__ import annotations

from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models.project import Project
from db.repositories.base_repository import BaseRepository


class ProjectRepository(BaseRepository[Project]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Project, session)

    async def get_by_slug(self, slug: str) -> Project | None:
        stmt = select(Project).where(Project.slug == slug)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_active(self) -> Sequence[Project]:
        stmt = select(Project).where(Project.is_active == True).order_by(Project.name)  # noqa: E712
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def upsert_from_config(self, config: dict) -> Project:
        """Create or update a project from a JSON config dict."""
        from slugify import slugify  # type: ignore

        slug = config.get("project_id") or slugify(config.get("name", "unnamed"))
        existing = await self.get_by_slug(slug)

        if existing:
            return await self.update(
                existing,
                name=config.get("name", existing.name),
                description=config.get("description", existing.description),
                config=config,
            )
        return await self.create(
            name=config["name"],
            slug=slug,
            description=config.get("description", ""),
            config=config,
        )
