from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import BotUser, SupportMessage, SupportTicket


async def get_or_create_open_ticket(session: AsyncSession, bot_user: BotUser) -> SupportTicket:
    result = await session.execute(
        select(SupportTicket).where(SupportTicket.bot_user_id == bot_user.id, SupportTicket.status == "OPEN")
    )
    ticket = result.scalar_one_or_none()
    if ticket:
        return ticket

    ticket = SupportTicket(bot_user_id=bot_user.id)
    session.add(ticket)
    await session.commit()
    await session.refresh(ticket)
    return ticket


async def add_message(
    session: AsyncSession, ticket: SupportTicket, *, text: str, from_admin: bool, admin_telegram_id: int | None = None
) -> SupportMessage:
    message = SupportMessage(ticket_id=ticket.id, text=text, from_admin=from_admin, admin_telegram_id=admin_telegram_id)
    session.add(message)
    await session.commit()
    return message


async def list_open_tickets(session: AsyncSession) -> list[SupportTicket]:
    result = await session.execute(
        select(SupportTicket)
        .options(selectinload(SupportTicket.messages))
        .where(SupportTicket.status == "OPEN")
        .order_by(SupportTicket.created_at)
    )
    return list(result.scalars())


async def get_ticket(session: AsyncSession, ticket_id: int) -> SupportTicket | None:
    return await session.get(SupportTicket, ticket_id)


async def close_ticket(session: AsyncSession, ticket: SupportTicket) -> None:
    ticket.status = "CLOSED"
    await session.commit()
