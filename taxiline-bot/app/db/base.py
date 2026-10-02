from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    pass


# Every "timestamp without time zone" column is naive UTC: Python code writes datetime.utcnow(),
# so the session timezone is pinned to UTC too — otherwise server_default=func.now() would store
# the Postgres server's local time (e.g. Asia/Tashkent) and mix +5h offsets into the same data.
engine = create_async_engine(
    settings.bot_database_url,
    pool_pre_ping=True,
    connect_args={"server_settings": {"timezone": "UTC"}},
)
SessionFactory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


@asynccontextmanager
async def session_scope() -> AsyncIterator[AsyncSession]:
    async with SessionFactory() as session:
        yield session
