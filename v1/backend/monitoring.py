import time
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from collections import defaultdict, deque
import psutil
import os

class PerformanceMonitor:
    def __init__(self, max_history: int = 1000):
        self.max_history = max_history
        self.response_times = deque(maxlen=max_history)
        self.cache_hits = 0
        self.cache_misses = 0
        self.request_count = 0
        self.error_count = 0
        self.start_time = datetime.now()
        self.endpoint_stats = defaultdict(lambda: {
            'count': 0,
            'total_time': 0.0,
            'errors': 0,
            'avg_time': 0.0
        })
    
    def record_request(self, endpoint: str, response_time: float, success: bool = True):
        """Record a request with its response time"""
        self.request_count += 1
        self.response_times.append(response_time)
        
        # Update endpoint stats
        stats = self.endpoint_stats[endpoint]
        stats['count'] += 1
        stats['total_time'] += response_time
        stats['avg_time'] = stats['total_time'] / stats['count']
        
        if not success:
            self.error_count += 1
            stats['errors'] += 1
    
    def record_cache_hit(self):
        """Record a cache hit"""
        self.cache_hits += 1
    
    def record_cache_miss(self):
        """Record a cache miss"""
        self.cache_misses += 1
    
    def get_stats(self) -> Dict[str, Any]:
        """Get comprehensive performance statistics"""
        if not self.response_times:
            return self._get_empty_stats()
        
        response_times_list = list(self.response_times)
        avg_response_time = sum(response_times_list) / len(response_times_list)
        
        # Calculate percentiles
        sorted_times = sorted(response_times_list)
        p50 = sorted_times[len(sorted_times) // 2]
        p95 = sorted_times[int(len(sorted_times) * 0.95)]
        p99 = sorted_times[int(len(sorted_times) * 0.99)]
        
        # Calculate cache hit rate
        total_cache_requests = self.cache_hits + self.cache_misses
        cache_hit_rate = (self.cache_hits / total_cache_requests * 100) if total_cache_requests > 0 else 0
        
        # Calculate error rate
        error_rate = (self.error_count / self.request_count * 100) if self.request_count > 0 else 0
        
        # Get system metrics
        system_metrics = self._get_system_metrics()
        
        return {
            "uptime_seconds": (datetime.now() - self.start_time).total_seconds(),
            "total_requests": self.request_count,
            "error_count": self.error_count,
            "error_rate_percent": round(error_rate, 2),
            "response_times": {
                "average_ms": round(avg_response_time * 1000, 2),
                "p50_ms": round(p50 * 1000, 2),
                "p95_ms": round(p95 * 1000, 2),
                "p99_ms": round(p99 * 1000, 2),
                "min_ms": round(min(response_times_list) * 1000, 2),
                "max_ms": round(max(response_times_list) * 1000, 2)
            },
            "cache": {
                "hits": self.cache_hits,
                "misses": self.cache_misses,
                "hit_rate_percent": round(cache_hit_rate, 2)
            },
            "endpoints": dict(self.endpoint_stats),
            "system": system_metrics
        }
    
    def _get_empty_stats(self) -> Dict[str, Any]:
        """Get stats when no requests have been recorded"""
        return {
            "uptime_seconds": (datetime.now() - self.start_time).total_seconds(),
            "total_requests": 0,
            "error_count": 0,
            "error_rate_percent": 0,
            "response_times": {
                "average_ms": 0,
                "p50_ms": 0,
                "p95_ms": 0,
                "p99_ms": 0,
                "min_ms": 0,
                "max_ms": 0
            },
            "cache": {
                "hits": 0,
                "misses": 0,
                "hit_rate_percent": 0
            },
            "endpoints": {},
            "system": self._get_system_metrics()
        }
    
    def _get_system_metrics(self) -> Dict[str, Any]:
        """Get system resource usage metrics"""
        try:
            process = psutil.Process(os.getpid())
            memory_info = process.memory_info()
            
            return {
                "cpu_percent": round(process.cpu_percent(), 2),
                "memory_mb": round(memory_info.rss / (1024 * 1024), 2),
                "memory_percent": round(process.memory_percent(), 2),
                "threads": process.num_threads(),
                "open_files": len(process.open_files()),
                "connections": len(process.connections())
            }
        except Exception as e:
            return {"error": str(e)}
    
    def reset_stats(self):
        """Reset all statistics"""
        self.response_times.clear()
        self.cache_hits = 0
        self.cache_misses = 0
        self.request_count = 0
        self.error_count = 0
        self.start_time = datetime.now()
        self.endpoint_stats.clear()

# Global performance monitor instance
performance_monitor = PerformanceMonitor() 