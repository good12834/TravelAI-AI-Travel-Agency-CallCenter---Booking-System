import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "travelai-secret-fallback-key-2026")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "travelai-jwt-fallback-key-2026")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
    
    # Defaults to SQLite if MySQL is not set up or reachable
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///travelai.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    AI_API_KEY = os.getenv("AI_API_KEY", "mock-ai-key")
    STT_API_KEY = os.getenv("STT_API_KEY", "mock-stt-key")
    TTS_API_KEY = os.getenv("TTS_API_KEY", "mock-tts-key")

    # Stripe Payments
    STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
    STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
    STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

    # Google Gemini AI
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
    GEMINI_FALLBACK_MODELS = [m.strip() for m in os.getenv("GEMINI_FALLBACK_MODELS", "gemini-flash-lite-latest,gemini-2.5-flash,gemini-flash-latest").split(",") if m.strip()]
    GEMINI_TIMEOUT_MS = int(os.getenv("GEMINI_TIMEOUT_MS", "15000"))



class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig
}
