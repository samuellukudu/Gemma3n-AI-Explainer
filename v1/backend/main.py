from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import asyncio
import logging
import json

# Configure logging
logger = logging.getLogger(__name__)

# Import configuration and routes
from backend.config import settings, validate_environment
from backend.api.routes import router
from backend.database import db
from backend.task_queue import task_queue
from backend.profiler import profiler

# Validate environment variables
try:
    validate_environment()
except ValueError as e:
    print(f"Configuration error: {e}")
    print("Please set the required environment variables: BASE_URL, API_KEY")
    exit(1)

# Set up logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s %(message)s',
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.API_TITLE,
    description=settings.API_DESCRIPTION,
    version=settings.API_VERSION,
    debug=settings.DEBUG
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)

@app.on_event("startup")
async def startup_event():
    """Initialize database and start task queue on startup"""
    print("Initializing database...")
    await db.init()
    print("Database initialized successfully")
    
    print("Starting task queue...")
    await task_queue.start()
    print("Task queue started successfully")
    
    # Recover pending tasks in the background
    asyncio.create_task(recover_pending_tasks())
    
    # Start periodic performance monitoring in the background
    asyncio.create_task(periodic_performance_monitoring())
    
    print(f"Starting Gemma Hackathon API on {settings.HOST}:{settings.PORT}")
    print(f"Debug mode: {settings.DEBUG}")
    print(f"API Documentation: http://{settings.HOST}:{settings.PORT}/docs")
    print(f"Health check: http://{settings.HOST}:{settings.PORT}/api/health")
    print(f"Performance metrics: http://{settings.HOST}:{settings.PORT}/api/performance/metrics")
    print("[DEBUG] BASE_URL:", os.getenv("BASE_URL"))
    print("[DEBUG] API_KEY:", os.getenv("API_KEY"))
    print("[DEBUG] MODEL:", os.getenv("MODEL"))

async def recover_pending_tasks():
    """Recover and re-queue pending tasks from database on startup"""
    try:
        print("Recovering pending tasks...")
        pending_tasks = await db.get_pending_tasks()
        recovered_count = 0
        
        for task in pending_tasks:
            try:
                # Re-queue the task
                await task_queue._queue.put({
                    'task_id': task['task_id'],
                    'task_type': task['task_type'],
                    'payload': json.loads(task['payload']) if task['payload'] else {}
                })
                recovered_count += 1
            except Exception as e:
                logger.error(f"Failed to recover task {task['task_id']}: {e}")
                # Mark task as failed
                await db.update_task_status(task['task_id'], 'failed', error_message=str(e))
        
        print(f"Recovered {recovered_count} pending tasks")
    except Exception as e:
        logger.error(f"Error during task recovery: {e}")

async def periodic_performance_monitoring():
    """Periodically monitor and log performance metrics"""
    while True:
        try:
            await asyncio.sleep(300)  # Monitor every 5 minutes
            await task_queue.log_performance_summary()
            
            # Log profiler summary
            summary = profiler.get_summary()
            if summary.get('blocking_operations'):
                print(f"[Performance] Detected {len(summary['blocking_operations'])} blocking operations")
            if summary.get('slow_operations'):
                print(f"[Performance] Detected {len(summary['slow_operations'])} slow operations")
                
        except Exception as e:
            print(f"[Performance] Error in periodic monitoring: {e}")
            await asyncio.sleep(60)  # Wait 1 minute before retrying

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown"""
    print("Stopping task queue...")
    await task_queue.stop()
    print("Task queue stopped successfully")

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": f"{settings.API_TITLE} is running!",
        "version": settings.API_VERSION,
        "docs": "/docs",
        "health": "/api/health",
        "features": [
            "Background task processing",
            "Database persistence",
            "Hybrid caching (memory + database)",
            "Request history tracking",
            "Batch processing support"
        ]
    }

if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
