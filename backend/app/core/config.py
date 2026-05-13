from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://trolley:trolley@localhost:5432/smart_trolley"
    SYNC_DATABASE_URL: str = "postgresql://trolley:trolley@localhost:5432/smart_trolley"

    SECRET_KEY: str = "dev-secret-key"
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    VISION_SERVICE_URL: str = "http://localhost:8001"
    HARDWARE_SERVICE_URL: str = "http://localhost:8002"

    ECOCASH_API_URL: str = "https://api.ecocash.co.zw/v1"
    ECOCASH_API_KEY: str = "mock_key"
    ECOCASH_MERCHANT_CODE: str = "MOCK_MERCHANT"
    ECOCASH_MOCK_MODE: bool = True

    LOG_LEVEL: str = "INFO"
    ENVIRONMENT: str = "development"

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
