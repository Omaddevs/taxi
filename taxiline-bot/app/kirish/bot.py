import logging

from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import BotCommand

from app.kirish import handlers

logger = logging.getLogger(__name__)

COMMANDS = [
    BotCommand(command="kirish", description="Saytga kirish kodi"),
    BotCommand(command="royxatdan_otish", description="Ro'yxatdan o'tish kodi"),
    BotCommand(command="profil", description="Profil"),
    BotCommand(command="sozlamalar", description="Kodni saytga avto-yozish"),
    BotCommand(command="help", description="Yordam va admin bilan aloqa"),
]


def build_kirish_dispatcher() -> Dispatcher:
    dp = Dispatcher(storage=MemoryStorage())
    dp.include_router(handlers.router)
    return dp


async def setup_kirish_bot(bot: Bot) -> None:
    """Commands menu and profile texts — best effort, the bot works without them."""
    try:
        await bot.set_my_commands(COMMANDS)
        await bot.set_my_short_description("TaxiLine — saytga kirish va ro'yxatdan o'tish kodlari")
        await bot.set_my_description(
            "TaxiLine kirish boti: taxiline.uz saytiga kirish va ro'yxatdan o'tish uchun tasdiqlash kodini beradi. "
            "Boshlash uchun «Start»ni bosing."
        )
    except Exception:
        logger.exception("kirish bot setup failed")
