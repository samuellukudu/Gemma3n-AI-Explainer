import asyncio
import time
import functools
import logging
from typing import Dict, Any, Callable, Optional
from concurrent.futures import ThreadPoolExecutor
import threading
import psutil
import os

# Configure logging for profiling
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AsyncProfiler:
    """Profiler for identifying blocking code and performance bottlenecks"""
    
    def __init__(self):
        self.task_metrics: Dict[str, Dict[str, Any]] = {}
        self.thread_pool = ThreadPoolExecutor(max_workers=4, thread_name_prefix="blocking_task")
        self.blocking_threshold = 0.1  # 100ms threshold for blocking operations
        
    def profile_async_function(self, func_name: str = None):
        """Decorator to profile async functions and detect blocking operations"""
        def decorator(func: Callable):
            name = func_name or f"{func.__module__}.{func.__name__}"
            
            @functools.wraps(func)
            async def wrapper(*args, **kwargs):
                start_time = time.time()
                start_cpu = time.process_time()
                
                # Monitor event loop blocking
                loop = asyncio.get_event_loop()
                loop_start = loop.time()
                
                try:
                    result = await func(*args, **kwargs)
                    
                    end_time = time.time()
                    end_cpu = time.process_time()
                    loop_end = loop.time()
                    
                    # Calculate metrics
                    wall_time = end_time - start_time
                    cpu_time = end_cpu - start_cpu
                    loop_time = loop_end - loop_start
                    
                    # Detect potential blocking
                    is_blocking = cpu_time > self.blocking_threshold
                    cpu_intensive = cpu_time / wall_time > 0.8 if wall_time > 0 else False
                    
                    # Log metrics
                    self._record_metrics(name, {
                        'wall_time': wall_time,
                        'cpu_time': cpu_time,
                        'loop_time': loop_time,
                        'is_blocking': is_blocking,
                        'cpu_intensive': cpu_intensive,
                        'success': True
                    })
                    
                    # Log warnings for blocking operations
                    if is_blocking:
                        logger.warning(
                            f"[BLOCKING DETECTED] {name}: CPU time {cpu_time:.3f}s > threshold {self.blocking_threshold}s"
                        )
                    
                    if cpu_intensive:
                        logger.warning(
                            f"[CPU INTENSIVE] {name}: CPU usage {cpu_time/wall_time*100:.1f}% of wall time"
                        )
                    
                    return result
                    
                except Exception as e:
                    end_time = time.time()
                    wall_time = end_time - start_time
                    
                    self._record_metrics(name, {
                        'wall_time': wall_time,
                        'error': str(e),
                        'success': False
                    })
                    
                    logger.error(f"[ERROR] {name}: {str(e)} (took {wall_time:.3f}s)")
                    raise
                    
            return wrapper
        return decorator
    
    def _record_metrics(self, func_name: str, metrics: Dict[str, Any]):
        """Record metrics for a function call"""
        if func_name not in self.task_metrics:
            self.task_metrics[func_name] = {
                'call_count': 0,
                'total_time': 0,
                'total_cpu_time': 0,
                'blocking_count': 0,
                'error_count': 0,
                'avg_time': 0,
                'max_time': 0
            }
        
        stats = self.task_metrics[func_name]
        stats['call_count'] += 1
        
        if metrics.get('success', False):
            wall_time = metrics['wall_time']
            cpu_time = metrics.get('cpu_time', 0)
            
            stats['total_time'] += wall_time
            stats['total_cpu_time'] += cpu_time
            stats['avg_time'] = stats['total_time'] / stats['call_count']
            stats['max_time'] = max(stats['max_time'], wall_time)
            
            if metrics.get('is_blocking', False):
                stats['blocking_count'] += 1
        else:
            stats['error_count'] += 1
    
    async def run_in_thread(self, func: Callable, *args, **kwargs):
        """Run blocking code in a thread pool to avoid blocking the event loop"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self.thread_pool, func, *args, **kwargs)
    
    def get_performance_report(self) -> Dict[str, Any]:
        """Generate a performance report with blocking code analysis"""
        report = {
            'system_info': self._get_system_info(),
            'function_metrics': {},
            'blocking_functions': [],
            'slow_functions': [],
            'error_prone_functions': []
        }
        
        for func_name, stats in self.task_metrics.items():
            report['function_metrics'][func_name] = stats.copy()
            
            # Identify problematic functions
            if stats['blocking_count'] > 0:
                report['blocking_functions'].append({
                    'name': func_name,
                    'blocking_ratio': stats['blocking_count'] / stats['call_count'],
                    'total_blocking': stats['blocking_count']
                })
            
            if stats['avg_time'] > 1.0:  # Functions taking more than 1 second on average
                report['slow_functions'].append({
                    'name': func_name,
                    'avg_time': stats['avg_time'],
                    'max_time': stats['max_time']
                })
            
            if stats['error_count'] > 0:
                report['error_prone_functions'].append({
                    'name': func_name,
                    'error_ratio': stats['error_count'] / stats['call_count'],
                    'total_errors': stats['error_count']
                })
        
        # Sort by severity
        report['blocking_functions'].sort(key=lambda x: x['blocking_ratio'], reverse=True)
        report['slow_functions'].sort(key=lambda x: x['avg_time'], reverse=True)
        report['error_prone_functions'].sort(key=lambda x: x['error_ratio'], reverse=True)
        
        return report
    
    def _get_system_info(self) -> Dict[str, Any]:
        """Get current system performance information"""
        process = psutil.Process(os.getpid())
        
        return {
            'cpu_percent': process.cpu_percent(),
            'memory_percent': process.memory_percent(),
            'memory_info': process.memory_info()._asdict(),
            'num_threads': process.num_threads(),
            'num_fds': process.num_fds() if hasattr(process, 'num_fds') else None,
            'system_cpu_count': psutil.cpu_count(),
            'system_memory': psutil.virtual_memory()._asdict()
        }
    
    def log_performance_summary(self):
        """Log a summary of performance metrics"""
        report = self.get_performance_report()
        
        logger.info("=== PERFORMANCE PROFILING SUMMARY ===")
        logger.info(f"System CPU: {report['system_info']['cpu_percent']:.1f}%")
        logger.info(f"System Memory: {report['system_info']['memory_percent']:.1f}%")
        logger.info(f"Process Threads: {report['system_info']['num_threads']}")
        
        if report['blocking_functions']:
            logger.warning("BLOCKING FUNCTIONS DETECTED:")
            for func in report['blocking_functions'][:5]:  # Top 5
                logger.warning(f"  - {func['name']}: {func['blocking_ratio']*100:.1f}% blocking calls")
        
        if report['slow_functions']:
            logger.warning("SLOW FUNCTIONS DETECTED:")
            for func in report['slow_functions'][:5]:  # Top 5
                logger.warning(f"  - {func['name']}: avg {func['avg_time']:.3f}s, max {func['max_time']:.3f}s")
        
        if report['error_prone_functions']:
            logger.error("ERROR-PRONE FUNCTIONS DETECTED:")
            for func in report['error_prone_functions'][:5]:  # Top 5
                logger.error(f"  - {func['name']}: {func['error_ratio']*100:.1f}% error rate")
    
    def reset_metrics(self):
        """Reset all collected metrics"""
        self.task_metrics.clear()
        logger.info("Performance metrics reset")
    
    def shutdown(self):
        """Shutdown the profiler and thread pool"""
        self.thread_pool.shutdown(wait=True)
        logger.info("Profiler shutdown complete")

# Global profiler instance
profiler = AsyncProfiler()

# Convenience decorators
def profile_task(func_name: str = None):
    """Decorator to profile async task functions"""
    return profiler.profile_async_function(func_name)

def profile_endpoint(func_name: str = None):
    """Decorator to profile API endpoint functions"""
    return profiler.profile_async_function(func_name)

async def run_blocking_safely(func: Callable, *args, **kwargs):
    """Run potentially blocking code safely in a thread pool"""
    return await profiler.run_in_thread(func, *args, **kwargs)