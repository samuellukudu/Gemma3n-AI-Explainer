import os
from dotenv import load_dotenv
from typing import Optional

# Load environment variables
load_dotenv()

class Settings:
    # API Configuration
    API_TITLE: str = "Gemma Hackathon API"
    API_VERSION: str = "1.0.0"
    API_DESCRIPTION: str = "A FastAPI backend for the Gemma Hackathon project"
    
    # Server Configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # AI/LLM Configuration
    BASE_URL: Optional[str] = os.getenv("BASE_URL")
    API_KEY: Optional[str] = os.getenv("API_KEY")
    MODEL: str = os.getenv("MODEL", "gemma-2b-it")
    
    # Database Configuration
    DATABASE_PATH: str = os.getenv("DATABASE_PATH", "llm_app.db")
    
    # Task Queue Configuration
    TASK_QUEUE_WORKERS: int = int(os.getenv("TASK_QUEUE_WORKERS", "4"))
    
    # CORS Configuration
    CORS_ORIGINS: list = os.getenv("CORS_ORIGINS", "*").split(",")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")

# Create settings instance
settings = Settings()

# Validate required environment variables
def validate_environment():
    """Validate that required environment variables are set"""
    required_vars = ["BASE_URL", "API_KEY"]
    missing_vars = [var for var in required_vars if not getattr(settings, var)]
    
    if missing_vars:
        raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")
    
    return True