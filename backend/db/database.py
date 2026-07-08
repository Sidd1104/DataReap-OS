"""
Database engine, session factory, and base declarative model.
Supports SQLite, PostgreSQL, and MySQL via async SQLAlchemy.
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from config.settings import get_settings

settings = get_settings()


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""
    pass


def _build_engine() -> AsyncEngine:
    """Create the async database engine with appropriate settings."""
    connect_args = {}
    engine_kwargs: dict = {
        "echo": settings.app_env == "development",
        "future": True,
    }

    if settings.is_sqlite:
        # SQLite requires check_same_thread=False for async use
        connect_args["check_same_thread"] = False
        engine_kwargs["pool_pre_ping"] = True
    else:
        # Connection pooling for PostgreSQL / MySQL
        engine_kwargs.update(
            {
                "pool_size": 10,
                "max_overflow": 20,
                "pool_recycle": 3600,
                "pool_pre_ping": True,
            }
        )

    return create_async_engine(
        settings.database_url,
        connect_args=connect_args,
        **engine_kwargs,
    )


engine: AsyncEngine = _build_engine()

AsyncSessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def init_db() -> None:
    """Create all tables on startup (idempotent)."""
    # Import all models to ensure they are registered with Base
    from db.models import project, job, row_result, log_entry, app_settings  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """Dispose the engine on shutdown."""
    await engine.dispose()


@asynccontextmanager
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Async context manager for database sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for injecting a database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
