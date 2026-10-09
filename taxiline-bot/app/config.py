from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    bot_token: str
    # @taxiline_kirish_bot (website sign-in codes). Empty → that bot isn't started.
    kirish_bot_token: str = ""
    bot_database_url: str

    server_api_url: str = "http://localhost:4000"
    bot_api_secret: str

    webapp_url: str

    super_admin_telegram_ids: str = ""
    default_drivers_closed_group_id: int = 0

    tts_cache_dir: str = "./tts_cache"
    inactivity_nudge_seconds: int = 60
    driver_subscription_days: int = 30
    subscription_reminder_days: int = 5
    claim_timeout_minutes: int = 10
    driver_no_show_alert_threshold: int = 3
    admin_contact_url: str = "https://t.me/taxiline_toshkent"

    bot_http_port: int = 8081

    @property
    def super_admin_ids(self) -> set[int]:
        return {int(x) for x in self.super_admin_telegram_ids.replace(" ", "").split(",") if x}


settings = Settings()
