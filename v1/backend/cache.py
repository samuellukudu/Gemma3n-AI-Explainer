import asyncio
import time
from typing import Dict, Any, Optional, List, Tuple
from collections import OrderedDict
from datetime import datetime, timedelta
import json
import hashlib
from backend.config import settings
from backend.monitoring import performance_monitor

class QueryCache:
    """LRU Cache specifically designed for database queries with query_id focus"""
    
    def __init__(self, max_size: int = 1000, ttl_hours: int = 24):
        self.max_size = max_size
        self.ttl_seconds = ttl_hours * 3600
        self._cache: OrderedDict[str, Dict[str, Any]] = OrderedDict()
        self._lock = asyncio.Lock()
        
    def _generate_cache_key(self, query_id: str, content_type: str, lesson_index: Optional[int] = None) -> str:
        """Generate a cache key for query-based content"""
        if lesson_index is not None:
            return f"{content_type}:{query_id}:{lesson_index}"
        return f"{content_type}:{query_id}"
    
    def _is_expired(self, cache_entry: Dict[str, Any]) -> bool:
        """Check if a cache entry has expired"""
        if self.ttl_seconds <= 0:
            return False
        
        timestamp = cache_entry.get('timestamp', 0)
        return time.time() - timestamp > self.ttl_seconds
    
    async def get(self, query_id: str, content_type: str, lesson_index: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """Get cached content for a query_id and content type"""
        async with self._lock:
            cache_key = self._generate_cache_key(query_id, content_type, lesson_index)
            
            if cache_key not in self._cache:
                performance_monitor.record_cache_miss()
                return None
            
            cache_entry = self._cache[cache_key]
            
            # Check if expired
            if self._is_expired(cache_entry):
                del self._cache[cache_key]
                performance_monitor.record_cache_miss()
                return None
            
            # Move to end (most recently used)
            self._cache.move_to_end(cache_key)
            performance_monitor.record_cache_hit()
            
            return cache_entry['data']
    
    async def set(self, query_id: str, content_type: str, data: Dict[str, Any], lesson_index: Optional[int] = None):
        """Cache content for a query_id and content type"""
        async with self._lock:
            cache_key = self._generate_cache_key(query_id, content_type, lesson_index)
            
            # Remove oldest entries if at capacity
            while len(self._cache) >= self.max_size:
                oldest_key = next(iter(self._cache))
                del self._cache[oldest_key]
            
            # Add new entry
            self._cache[cache_key] = {
                'data': data,
                'timestamp': time.time(),
                'query_id': query_id,
                'content_type': content_type,
                'lesson_index': lesson_index
            }
    
    async def invalidate_query(self, query_id: str):
        """Invalidate all cached content for a specific query_id"""
        async with self._lock:
            keys_to_remove = []
            for key, entry in self._cache.items():
                if entry['query_id'] == query_id:
                    keys_to_remove.append(key)
            
            for key in keys_to_remove:
                del self._cache[key]
    
    async def invalidate_content_type(self, content_type: str):
        """Invalidate all cached content of a specific type"""
        async with self._lock:
            keys_to_remove = []
            for key, entry in self._cache.items():
                if entry['content_type'] == content_type:
                    keys_to_remove.append(key)
            
            for key in keys_to_remove:
                del self._cache[key]
    
    async def clear(self):
        """Clear all cached content"""
        async with self._lock:
            self._cache.clear()
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        async with self._lock:
            now = time.time()
            expired_count = 0
            content_type_counts = {}
            query_id_counts = {}
            
            for entry in self._cache.values():
                if self._is_expired(entry):
                    expired_count += 1
                    continue
                
                content_type = entry['content_type']
                query_id = entry['query_id']
                
                content_type_counts[content_type] = content_type_counts.get(content_type, 0) + 1
                query_id_counts[query_id] = query_id_counts.get(query_id, 0) + 1
            
            return {
                'total_entries': len(self._cache),
                'expired_entries': expired_count,
                'active_entries': len(self._cache) - expired_count,
                'max_size': self.max_size,
                'ttl_hours': self.ttl_seconds / 3600,
                'content_type_distribution': content_type_counts,
                'unique_query_ids': len(query_id_counts),
                'top_query_ids': sorted(query_id_counts.items(), key=lambda x: x[1], reverse=True)[:10]
            }
    
    async def cleanup_expired(self):
        """Remove expired entries from cache"""
        async with self._lock:
            keys_to_remove = []
            for key, entry in self._cache.items():
                if self._is_expired(entry):
                    keys_to_remove.append(key)
            
            for key in keys_to_remove:
                del self._cache[key]
            
            return len(keys_to_remove)

class CachedDatabase:
    """Database wrapper with integrated caching for query_id based operations"""
    
    def __init__(self, database_instance, cache_instance: QueryCache):
        self.db = database_instance
        self.cache = cache_instance
    
    async def get_lessons_by_query_id(self, query_id: str) -> Optional[Dict]:
        """Get lessons with caching"""
        # Try cache first
        cached_data = await self.cache.get(query_id, 'lessons')
        if cached_data:
            return cached_data
        
        # Fetch from database
        data = await self.db.get_lessons_by_query_id(query_id)
        if data:
            await self.cache.set(query_id, 'lessons', data)
        
        return data
    
    async def get_related_questions_by_query_id(self, query_id: str) -> Optional[Dict]:
        """Get related questions with caching"""
        # Try cache first
        cached_data = await self.cache.get(query_id, 'related_questions')
        if cached_data:
            return cached_data
        
        # Fetch from database
        data = await self.db.get_related_questions_by_query_id(query_id)
        if data:
            await self.cache.set(query_id, 'related_questions', data)
        
        return data
    
    async def get_flashcards_by_query_id(self, query_id: str) -> List[Dict]:
        """Get all flashcards with caching"""
        # Try cache first
        cached_data = await self.cache.get(query_id, 'flashcards_all')
        if cached_data:
            return cached_data
        
        # Fetch from database
        data = await self.db.get_flashcards_by_query_id(query_id)
        if data:
            await self.cache.set(query_id, 'flashcards_all', data)
        
        return data
    
    async def get_flashcards_by_query_id_and_lesson_index(self, query_id: str, lesson_index: int) -> Optional[Dict]:
        """Get specific lesson flashcards with caching"""
        # Try cache first
        cached_data = await self.cache.get(query_id, 'flashcards', lesson_index)
        if cached_data:
            return cached_data
        
        # Fetch from database
        data = await self.db.get_flashcards_by_query_id_and_lesson_index(query_id, lesson_index)
        if data:
            await self.cache.set(query_id, 'flashcards', data, lesson_index)
        
        return data
    
    async def get_quiz_by_query_id_and_lesson_index(self, query_id: str, lesson_index: int) -> Optional[Dict]:
        """Get quiz with caching"""
        # Try cache first
        cached_data = await self.cache.get(query_id, 'quiz', lesson_index)
        if cached_data:
            return cached_data
        
        # Fetch from database
        data = await self.db.get_quiz_by_query_id_and_lesson_index(query_id, lesson_index)
        if data:
            await self.cache.set(query_id, 'quiz', data, lesson_index)
        
        return data
    
    async def save_lessons_history(self, query_id: str, lessons_json: str, processing_time: float = None):
        """Save lessons and invalidate cache"""
        await self.db.save_lessons_history(query_id, lessons_json, processing_time)
        await self.cache.invalidate_query(query_id)
    
    async def save_related_questions_history(self, query_id: str, questions_json: str, processing_time: float = None):
        """Save related questions and invalidate cache"""
        await self.db.save_related_questions_history(query_id, questions_json, processing_time)
        await self.cache.invalidate_query(query_id)
    
    async def save_flashcards_history(self, query_id: str, lesson_index: int, lesson_json: str, flashcards_json: str, processing_time: float = None):
        """Save flashcards and invalidate cache"""
        await self.db.save_flashcards_history(query_id, lesson_index, lesson_json, flashcards_json, processing_time)
        await self.cache.invalidate_query(query_id)
    
    async def save_quiz_history(self, query_id: str, lesson_index: int, quiz_json: str, processing_time: float = None):
        """Save quiz and invalidate cache"""
        await self.db.save_quiz_history(query_id, lesson_index, quiz_json, processing_time)
        await self.cache.invalidate_query(query_id)
    
    # Pass through methods that don't need caching
    async def init(self):
        return await self.db.init()
    
    async def create_background_task(self, task_id: str, task_type: str, payload: Dict[str, Any]) -> str:
        return await self.db.create_background_task(task_id, task_type, payload)
    
    async def update_task_status(self, task_id: str, status: str, result: str = None, error_message: str = None):
        return await self.db.update_task_status(task_id, status, result, error_message)
    
    async def get_task_status(self, task_id: str) -> Optional[Dict]:
        return await self.db.get_task_status(task_id)
    
    async def get_pending_tasks(self) -> List[Dict]:
        return await self.db.get_pending_tasks()
    
    async def create_lessons_placeholder(self, query_id: str):
        return await self.db.create_lessons_placeholder(query_id)
    
    async def create_related_questions_placeholder(self, query_id: str):
        return await self.db.create_related_questions_placeholder(query_id)
    
    async def create_flashcards_placeholder(self, query_id: str, lesson_index: int, lesson_json: str = ''):
        return await self.db.create_flashcards_placeholder(query_id, lesson_index, lesson_json)
    
    async def create_quiz_placeholder(self, query_id: str, lesson_index: int):
        return await self.db.create_quiz_placeholder(query_id, lesson_index)
    
    async def check_content_generation_status(self, query_id: str) -> Dict[str, bool]:
        return await self.db.check_content_generation_status(query_id)
    
    async def get_recent_lessons(self, limit: int = 50) -> List[Dict]:
        return await self.db.get_recent_lessons(limit)
    
    async def get_recent_related_questions(self, limit: int = 50) -> List[Dict]:
        return await self.db.get_recent_related_questions(limit)
    
    async def get_recent_flashcards(self, limit: int = 50) -> List[Dict]:
        return await self.db.get_recent_flashcards(limit)

# Initialize cache with configuration from settings
# Global cache instance
query_cache = QueryCache(max_size=settings.CACHE_MAX_SIZE, ttl_hours=settings.CACHE_TTL_HOURS)

# Background task for cache cleanup
async def cache_cleanup_task():
    """Background task to periodically clean up expired cache entries"""
    while True:
        try:
            await asyncio.sleep(3600)  # Run every hour
            removed_count = await query_cache.cleanup_expired()
            if removed_count > 0:
                print(f"[Cache] Cleaned up {removed_count} expired entries")
        except Exception as e:
            print(f"[Cache] Error during cleanup: {e}")