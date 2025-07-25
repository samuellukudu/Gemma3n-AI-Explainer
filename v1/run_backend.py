#!/usr/bin/env python3
"""
Startup script for the FastAPI backend
"""
import os
import sys
import uvicorn
from pathlib import Path

# Import the app and settings from the backend module
from backend.main import app
from backend.config import settings

if __name__ == "__main__":
    print(f"Starting {settings.API_TITLE} on {settings.HOST}:{settings.PORT}")
    print(f"Debug mode: {settings.DEBUG}")
    print(f"API Documentation: http://{settings.HOST}:{settings.PORT}/docs")
    print(f"Health check: http://{settings.HOST}:{settings.PORT}/api/health")
    
    uvicorn.run(
        "backend.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True, # reload=settings.DEBUG
        log_level="info",
        workers=4
    ) 