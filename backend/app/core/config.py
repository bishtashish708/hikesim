from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "HikeSim API"
    database_url: str = "sqlite:///./dev.db"

    class Config:
        env_prefix = "HIKESIM_"


settings = Settings()
