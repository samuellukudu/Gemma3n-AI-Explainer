from fastapi import APIRouter, HTTPException, BackgroundTasks, Body, Query
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import time
import asyncio
import json
from backend.config import settings
from backend.task_queue import task_queue
from backend.database import db
from backend.monitoring import performance_monitor
from backend.profiler import profile_endpoint
from backend.cache import query_cache
import logging
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api", tags=["API"])

# Request/Response models
class BackgroundTaskResponse(BaseModel):
    task_id: str
    status: str
    message: str

class QueryRequest(BaseModel):
    query: str
    user_id: Optional[str] = None

class QueryResponse(BaseModel):
    success: bool
    message: str
    query_id: Optional[str] = None

class ContentResponse(BaseModel):
    query_id: str
    content: Any  # Can be Dict or List
    created_at: str
    processing_time: Optional[float] = None

class ContentListResponse(BaseModel):
    items: List[Dict[str, Any]]
    total_count: int

class ContentGenerationStatusResponse(BaseModel):
    query_id: str
    lessons_generated: bool
    related_questions_generated: bool
    flashcards_generated: Dict[str, bool]  # lesson_index -> generated status
    quizzes_generated: Dict[str, bool]     # lesson_index -> generated status

# Background task status endpoint
@router.get("/tasks/{task_id}")
async def get_task_status(task_id: str):
    """Get the status of a background task"""
    task_info = await task_queue.get_task_status(task_id)
    if not task_info:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {
        "task_id": task_id,
        "status": task_info.get("status", "unknown"),
        "result": task_info.get("result"),
        "error_message": task_info.get("error_message"),
        "created_at": task_info.get("created_at"),
        "completed_at": task_info.get("completed_at")
    }

# Query endpoint
@router.post("/query", response_model=QueryResponse)
@profile_endpoint("api.process_query")
async def process_query(request: QueryRequest):
    """
    Accepts a query and user_id, triggers both related questions and lessons generation as background tasks,
    and returns immediately with task IDs for status tracking.
    """
    try:
        query_id = str(uuid.uuid4())
        
        # Submit related questions generation as background task
        await task_queue.submit_task(
            "query_related_questions",
            {
                "query": request.query,
                "user_id": request.user_id,
                "query_id": query_id
            }
        )
        
        # Submit lessons generation as background task
        await task_queue.submit_task(
            "query_lessons",
            {
                "query": request.query,
                "user_id": request.user_id,
                "query_id": query_id
            }
        )
        
        return QueryResponse(
            success=True, 
            message="Related questions and lessons generation started in background.", 
            query_id=query_id
        )
    except Exception as e:
        logger.error(f"[QueryAPI] Error in process_query endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error processing query.")

# Content retrieval endpoints using query_id
@router.get("/lessons/{query_id}", response_model=ContentResponse)
async def get_lessons_by_query_id(query_id: str):
    """Get lessons by query_id"""
    try:
        lessons_data = await db.get_lessons_by_query_id(query_id)
        if not lessons_data:
            raise HTTPException(status_code=404, detail="Lessons not found")
        
        return ContentResponse(
            query_id=query_id,
            content=json.loads(lessons_data["lessons_json"]),
            created_at=lessons_data["created_at"],
            processing_time=lessons_data["processing_time"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving lessons: {str(e)}"
        )

@router.get("/related-questions/{query_id}", response_model=ContentResponse)
async def get_related_questions_by_query_id(query_id: str):
    """Get related questions by query_id"""
    try:
        questions_data = await db.get_related_questions_by_query_id(query_id)
        if not questions_data:
            raise HTTPException(status_code=404, detail="Related questions not found")
        
        return ContentResponse(
            query_id=query_id,
            content=json.loads(questions_data["questions_json"]),
            created_at=questions_data["created_at"],
            processing_time=questions_data["processing_time"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving related questions: {str(e)}"
        )

@router.get("/flashcards/{query_id}", response_model=ContentResponse)
async def get_flashcards_by_query_id(query_id: str):
    """Get all flashcards for a given query_id, aggregating from all lessons."""
    try:
        flashcards_data = await db.get_flashcards_by_query_id(query_id)
        if not flashcards_data:
            raise HTTPException(status_code=404, detail="Flashcards not found")
        
        # Aggregate flashcards from all lessons
        all_flashcards = []
        total_processing_time = 0
        created_at = None
        
        for record in flashcards_data:
            # Skip records with empty JSON (placeholders)
            if record["flashcards_json"] and record["flashcards_json"].strip():
                all_flashcards.extend(json.loads(record["flashcards_json"]))
            if record["processing_time"]:
                total_processing_time += record["processing_time"]
            if not created_at:
                created_at = record["created_at"]

        return ContentResponse(
            query_id=query_id,
            content=all_flashcards,
            created_at=created_at or datetime.now().isoformat(),
            processing_time=total_processing_time
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving flashcards: {str(e)}"
        )

@router.get("/flashcards/{query_id}/{lesson_index}", response_model=ContentResponse)
async def get_flashcards_by_query_id_and_lesson_index(query_id: str, lesson_index: int):
    """Get flashcards for a specific lesson by query_id and lesson_index"""
    try:
        flashcards_data = await db.get_flashcards_by_query_id_and_lesson_index(query_id, lesson_index)
        if not flashcards_data:
            raise HTTPException(status_code=404, detail=f"Flashcards not found for lesson {lesson_index}")
        
        # Check if flashcards_json is empty (placeholder)
        if not flashcards_data["flashcards_json"] or not flashcards_data["flashcards_json"].strip():
            raise HTTPException(status_code=404, detail=f"Flashcards not yet generated for lesson {lesson_index}")
        
        return ContentResponse(
            query_id=query_id,
            content=json.loads(flashcards_data["flashcards_json"]),
            created_at=flashcards_data["created_at"],
            processing_time=flashcards_data["processing_time"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving flashcards: {str(e)}"
        )

@router.get("/quiz/{query_id}/{lesson_index}", response_model=ContentResponse)
async def get_quiz_by_query_id_and_lesson_index(query_id: str, lesson_index: int):
    """Get quiz for a specific lesson by query_id and lesson_index"""
    try:
        quiz_data = await db.get_quiz_by_query_id_and_lesson_index(query_id, lesson_index)
        if not quiz_data:
            raise HTTPException(status_code=404, detail=f"Quiz not found for lesson {lesson_index}")
        
        # Check if quiz_json is empty (placeholder)
        if not quiz_data["quiz_json"] or not quiz_data["quiz_json"].strip():
            raise HTTPException(status_code=404, detail=f"Quiz not yet generated for lesson {lesson_index}")
        
        return ContentResponse(
            query_id=query_id,
            content=json.loads(quiz_data["quiz_json"]),
            created_at=quiz_data["created_at"],
            processing_time=quiz_data["processing_time"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving quiz: {str(e)}"
        )

# Recent content endpoints
@router.get("/lessons", response_model=ContentListResponse)
async def get_recent_lessons(limit: int = 50):
    """Get recent lessons history"""
    try:
        history = await db.get_recent_lessons(limit=limit)
        return ContentListResponse(
            items=history,
            total_count=len(history)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving lessons history: {str(e)}"
        )

@router.get("/related-questions", response_model=ContentListResponse)
async def get_recent_related_questions(limit: int = 50):
    """Get recent related questions history"""
    try:
        history = await db.get_recent_related_questions(limit=limit)
        return ContentListResponse(
            items=history,
            total_count=len(history)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving related questions history: {str(e)}"
        )

@router.get("/flashcards", response_model=ContentListResponse)
async def get_recent_flashcards(limit: int = 50):
    """Get recent flashcards history"""
    try:
        history = await db.get_recent_flashcards(limit=limit)
        return ContentListResponse(
            items=history,
            total_count=len(history)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving flashcards history: {str(e)}"
        )

# Content generation status endpoint
@router.get("/content-status/{query_id}", response_model=ContentGenerationStatusResponse)
async def get_content_generation_status(query_id: str):
    """Get the generation status of all content types for a query"""
    try:
        status = await db.check_content_generation_status(query_id)
        return ContentGenerationStatusResponse(
            query_id=query_id,
            lessons_generated=status['lessons_generated'],
            related_questions_generated=status['related_questions_generated'],
            flashcards_generated=status['flashcards_generated'],
            quizzes_generated=status['quizzes_generated']
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error checking content generation status: {str(e)}"
        )

# Performance monitoring endpoint
@router.get("/performance")
async def get_performance_stats():
    """Get comprehensive performance statistics"""
    return performance_monitor.get_stats()

# Health check endpoint with enhanced status
@router.get("/health")
async def health_check():
    """Enhanced health check endpoint"""
    try:
        # Check database connectivity
        await db.get_lessons_by_query_id("health_check") # Changed to a valid query
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    return {
        "status": "healthy",
        "service": settings.API_TITLE,
        "version": settings.API_VERSION,
        "database": db_status,
        "task_queue": task_queue.get_queue_stats()
    }

# Performance monitoring endpoint
@router.get("/performance/metrics")
async def get_performance_metrics():
    """Get comprehensive performance metrics including profiling data"""
    try:
        metrics = task_queue.get_performance_metrics()
        return {
            "status": "success",
            "metrics": metrics,
            "timestamp": time.time()
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "timestamp": time.time()
        }

# Cache management endpoints
@router.get("/cache/stats")
async def get_cache_stats():
    """Get comprehensive cache statistics"""
    try:
        cache_stats = await query_cache.get_stats()
        performance_stats = performance_monitor.get_stats()
        
        return {
            "status": "success",
            "cache": cache_stats,
            "performance": {
                "cache_hits": performance_stats["cache"]["hits"],
                "cache_misses": performance_stats["cache"]["misses"],
                "hit_rate_percent": performance_stats["cache"]["hit_rate_percent"]
            },
            "timestamp": time.time()
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving cache stats: {str(e)}"
        )

@router.delete("/cache/clear")
async def clear_cache():
    """Clear all cached content"""
    try:
        await query_cache.clear()
        return {
            "status": "success",
            "message": "Cache cleared successfully",
            "timestamp": time.time()
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error clearing cache: {str(e)}"
        )

@router.delete("/cache/query/{query_id}")
async def clear_query_cache(query_id: str):
    """Clear cached content for a specific query_id"""
    try:
        await query_cache.invalidate_query(query_id)
        return {
            "status": "success",
            "message": f"Cache cleared for query_id: {query_id}",
            "query_id": query_id,
            "timestamp": time.time()
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error clearing query cache: {str(e)}"
        )

@router.delete("/cache/content-type/{content_type}")
async def clear_content_type_cache(content_type: str):
    """Clear cached content for a specific content type"""
    try:
        await query_cache.invalidate_content_type(content_type)
        return {
            "status": "success",
            "message": f"Cache cleared for content type: {content_type}",
            "content_type": content_type,
            "timestamp": time.time()
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error clearing content type cache: {str(e)}"
        )