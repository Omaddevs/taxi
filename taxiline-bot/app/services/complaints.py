from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Complaint


async def create(session: AsyncSession, bot_user_id: int, text: str) -> Complaint:
    complaint = Complaint(bot_user_id=bot_user_id, text=text)
    session.add(complaint)
    await session.commit()
    await session.refresh(complaint)
    return complaint


async def list_open(session: AsyncSession) -> list[Complaint]:
    result = await session.execute(
        select(Complaint).where(Complaint.status != "RESOLVED").order_by(Complaint.created_at)
    )
    return list(result.scalars())


async def get(session: AsyncSession, complaint_id: int) -> Complaint | None:
    return await session.get(Complaint, complaint_id)


async def update_status(session: AsyncSession, complaint: Complaint, *, status: str, reply: str | None) -> None:
    complaint.status = status
    if reply:
        complaint.admin_reply = reply
    await session.commit()
