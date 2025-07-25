import asyncio
import uuid
import time
from typing import Dict, Any, Optional, Callable, Coroutine
from datetime import datetime
import json
from backend.database import db
from backend.dspy_modules import (
    generate_lessons_module,
    generate_related_questions_module,
    generate_flashcards_module,
    generate_quiz_module,
    Lesson,
    RelatedQuestion,
    RelatedQuestionsSet,
    Flashcards
)
from backend.profiler import profiler, profile_task
import os

class TaskQueue:
    def __init__(self, max_workers: int = 4):
        self.max_workers = max_workers
        self.active_tasks: Dict[str, asyncio.Task] = {}
        self.task_results: Dict[str, Any] = {}
        self._queue = asyncio.Queue()
        self._workers = []
        self._running = False
    
    async def start(self):
        """Start the task queue workers"""
        if self._running:
            return
        
        self._running = True
        # Start worker tasks
        for i in range(self.max_workers):
            worker = asyncio.create_task(self._worker(f"worker-{i}"))
            self._workers.append(worker)
        
        # Start cleanup task
        asyncio.create_task(self._cleanup_old_tasks())
    
    async def stop(self):
        """Stop the task queue workers"""
        self._running = False
        
        # Cancel all workers
        for worker in self._workers:
            worker.cancel()
        
        # Wait for workers to finish
        if self._workers:
            await asyncio.gather(*self._workers, return_exceptions=True)
        
        # Cancel active tasks
        for task in self.active_tasks.values():
            task.cancel()
        
        self._workers.clear()
        self.active_tasks.clear()
    
    async def _worker(self, worker_name: str):
        """Worker coroutine that processes tasks from the queue"""
        while self._running:
            try:
                # Get task from queue with timeout
                task_data = await asyncio.wait_for(self._queue.get(), timeout=1.0)
                
                task_id = task_data['task_id']
                task_type = task_data['task_type']
                payload = task_data['payload']
                
                # Update task status to processing
                await db.update_task_status(task_id, 'processing')
                
                # Process the task
                try:
                    if task_type == 'query_related_questions':
                        result = await self._process_query_related_questions_task(payload)
                    elif task_type == 'query_lessons':
                        result = await self._process_query_lessons_task(payload)
                    else:
                        raise ValueError(f"Unknown task type: {task_type}")
                    
                    # Store result
                    self.task_results[task_id] = result
                    await db.update_task_status(task_id, 'completed', json.dumps(result))
                    
                except Exception as e:
                    error_msg = str(e)
                    await db.update_task_status(task_id, 'failed', error_message=error_msg)
                    self.task_results[task_id] = {'error': error_msg}
                
                finally:
                    self._queue.task_done()
                    
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                print(f"Worker {worker_name} error: {e}")
                continue
    
    async def _cleanup_old_tasks(self):
        """Clean up old completed tasks from memory and log performance metrics"""
        cleanup_count = 0
        
        while self._running:
            try:
                # Remove tasks older than 1 hour from memory
                cutoff_time = time.time() - 3600
                tasks_to_remove = []
                
                for task_id, task in self.active_tasks.items():
                    if task.done():
                        tasks_to_remove.append(task_id)
                
                for task_id in tasks_to_remove:
                    del self.active_tasks[task_id]
                    if task_id in self.task_results:
                        del self.task_results[task_id]
                
                # Log performance metrics every 10 cleanup cycles (50 minutes)
                cleanup_count += 1
                if cleanup_count % 10 == 0:
                    print(f"[TaskQueue] Periodic performance check (cleanup #{cleanup_count})")
                    self.log_performance_summary()
                
                await asyncio.sleep(300)  # Clean up every 5 minutes
                
            except Exception as e:
                print(f"[TaskQueue] Cleanup error: {e}")
                await asyncio.sleep(60)
    
    async def submit_task(self, task_type: str, payload: Dict[str, Any]) -> str:
        """Submit a new task to the queue"""
        task_id = str(uuid.uuid4())
        
        # Create task record in database
        await db.create_background_task(task_id, task_type, payload)
        
        # Add to queue
        await self._queue.put({
            'task_id': task_id,
            'task_type': task_type,
            'payload': payload
        })
        
        return task_id
    
    async def get_task_result(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get the result of a completed task"""
        # Check in-memory results first
        if task_id in self.task_results:
            return self.task_results[task_id]
        
        # Check database
        task_info = await db.get_task_status(task_id)
        if task_info and task_info['status'] == 'completed':
            return json.loads(task_info['result']) if task_info['result'] else None
        
        return None
    
    async def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get the status of a task"""
        # Check if task is still active
        if task_id in self.active_tasks:
            task = self.active_tasks[task_id]
            if task.done():
                return {'status': 'completed' if not task.exception() else 'failed'}
            else:
                return {'status': 'processing'}
        
        # Check database
        return await db.get_task_status(task_id)
    
    def get_queue_stats(self) -> Dict[str, Any]:
        """Get queue statistics"""
        return {
            'queue_size': self._queue.qsize(),
            'active_tasks': len(self.active_tasks),
            'workers': len(self._workers),
            'running': self._running
        }
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get comprehensive performance metrics including profiling data"""
        queue_stats = self.get_queue_stats()
        profiling_report = profiler.get_performance_report()
        
        return {
            'queue_stats': queue_stats,
            'profiling_report': profiling_report,
            'timestamp': time.time()
        }
    
    def log_performance_summary(self):
        """Log performance summary including blocking code detection"""
        profiler.log_performance_summary()
        
        # Log queue-specific metrics
        stats = self.get_queue_stats()
        print(f"[TaskQueue] Queue size: {stats['queue_size']}, Active tasks: {stats['active_tasks']}, Workers: {stats['workers']}")
        
        # Warn about queue backlog
        if stats['queue_size'] > 10:
            print(f"[TaskQueue] WARNING: Large queue backlog detected ({stats['queue_size']} tasks)")
        
        if stats['active_tasks'] > stats['workers'] * 2:
            print(f"[TaskQueue] WARNING: High task load detected ({stats['active_tasks']} active tasks for {stats['workers']} workers)")
    
    @profile_task("task_queue.process_query_related_questions")
    async def _process_query_related_questions_task(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Process query related questions generation task using DSPy"""
        from backend.monitoring import performance_monitor
        from backend.utils import manual_parse_related_questions

        start_time = time.time()
        query = payload['query']
        user_id = payload.get('user_id')
        query_id = payload.get('query_id')

        try:
            response = await generate_related_questions_module.acall(topic=query)
            performance_monitor.record_cache_miss()

            related_questions = response.questions.related_questions
            
            processing_time = time.time() - start_time

            # Save to database
            await db.save_related_questions_history(
                query_id=query_id,
                questions_json=json.dumps([q.model_dump() for q in related_questions]),
                processing_time=processing_time
            )

            return {
                'related_questions': [q.model_dump() for q in related_questions],
                'processing_time': processing_time,
                'success': True
            }
        except Exception as e:
            print(f"DSPy parsing failed for related questions: {e}")
            print("Attempting manual parsing...")
            
            # Get the raw response from the error
            raw_response = None
            if hasattr(e, 'lm_response'):
                raw_response = e.lm_response
            else:
                # Try to extract LM response from error message
                error_str = str(e)
                if "LM Response:" in error_str:
                    try:
                        start_marker = "LM Response: [[ ## questions ## ]]"
                        end_marker = "[[ ## completed ## ]]"
                        if start_marker in error_str and end_marker in error_str:
                            start_idx = error_str.find(start_marker) + len(start_marker)
                            end_idx = error_str.find(end_marker)
                            raw_response = error_str[start_idx:end_idx].strip()
                            print(f"Extracted raw response from error message")
                    except Exception as extract_error:
                        print(f"Failed to extract raw response from error: {extract_error}")
            
            if raw_response:
                try:
                    related_questions = manual_parse_related_questions(raw_response)
                    if related_questions:
                        print(f"Manual parsing successful! Found {len(related_questions)} related questions.")
                        
                        processing_time = time.time() - start_time
                        
                        # Save to database
                        await db.save_related_questions_history(
                            query_id=query_id,
                            questions_json=json.dumps([q.model_dump() for q in related_questions]),
                            processing_time=processing_time
                        )
                        
                        return {
                            'related_questions': [q.model_dump() for q in related_questions],
                            'processing_time': processing_time,
                            'success': True
                        }
                    else:
                        print("Manual parsing returned no questions.")
                except Exception as manual_error:
                    print(f"Manual parsing failed with error: {manual_error}")
            else:
                print("No raw response available for manual parsing.")
            
            processing_time = time.time() - start_time
            return {
                'error': str(e),
                'processing_time': processing_time,
                'success': False
            }
    
    @profile_task("task_queue.process_query_lessons")
    async def _process_query_lessons_task(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Process query lessons generation task using DSPy"""
        from backend.monitoring import performance_monitor
        from backend.utils import manual_parse_lessons, manual_parse_flashcards, manual_parse_quiz
        
        start_time = time.time()
        query = payload['query']
        user_id = payload.get('user_id')
        query_id = payload.get('query_id')

        try:
            response = await generate_lessons_module.acall(topic=query)
            lessons = response.lessons
            performance_monitor.record_cache_miss()

            processing_time = time.time() - start_time

            await db.save_lessons_history(
                query_id=query_id,
                lessons_json=json.dumps([l.model_dump() for l in lessons]),
                processing_time=processing_time
            )

            # Schedule flashcard and quiz generation in background
            if lessons:
                async def generate_flashcards_and_quiz_for_lesson(lesson: Lesson, lesson_index: int):
                    try:
                        start_time_fc = time.time()
                        
                        flashcard_response = await generate_flashcards_module.acall(topic=lesson.model_dump())
                        flashcards = flashcard_response.flashcards.cards
                        
                        processing_time_fc = time.time() - start_time_fc
                        
                        await db.save_flashcards_history(
                            query_id=query_id,
                            lesson_index=lesson_index,
                            lesson_json=lesson.model_dump_json(),
                            flashcards_json=json.dumps([c.model_dump() for c in flashcards]),
                            processing_time=processing_time_fc
                        )

                        # Generate quiz
                        start_time_quiz = time.time()
                        quiz_response = await generate_quiz_module.acall(flashcards=flashcard_response.flashcards.model_dump())
                        quiz = quiz_response.quiz
                        processing_time_quiz = time.time() - start_time_quiz

                        await db.save_quiz_history(
                            query_id=query_id,
                            lesson_index=lesson_index,
                            quiz_json=quiz.model_dump_json(),
                            processing_time=processing_time_quiz
                        )

                    except Exception as e:
                        print(f"Error generating flashcards/quiz for lesson {lesson_index}: {e}")
                        # Try manual parsing for flashcards
                        try:
                            if hasattr(e, 'lm_response'):
                                raw_response = e.lm_response
                                flashcards = manual_parse_flashcards(raw_response)
                                if flashcards:
                                    print(f"Manual parsing of flashcards successful for lesson {lesson_index}")
                                    processing_time_fc = time.time() - start_time_fc
                                    
                                    await db.save_flashcards_history(
                                        query_id=query_id,
                                        lesson_index=lesson_index,
                                        lesson_json=lesson.model_dump_json(),
                                        flashcards_json=json.dumps([c.model_dump() for c in flashcards]),
                                        processing_time=processing_time_fc
                                    )
                                    
                                    # Try manual parsing for quiz
                                    try:
                                        quiz_response = await generate_quiz_module.acall(flashcards={"cards": [c.model_dump() for c in flashcards]})
                                        quiz = quiz_response.quiz
                                    except Exception as quiz_e:
                                        if hasattr(quiz_e, 'lm_response'):
                                            quiz = manual_parse_quiz(quiz_e.lm_response)
                                            if quiz:
                                                print(f"Manual parsing of quiz successful for lesson {lesson_index}")
                                                processing_time_quiz = time.time() - start_time_quiz
                                                await db.save_quiz_history(
                                                    query_id=query_id,
                                                    lesson_index=lesson_index,
                                                    quiz_json=quiz.model_dump_json(),
                                                    processing_time=processing_time_quiz
                                                )
                        except Exception as manual_e:
                            print(f"Manual parsing also failed for lesson {lesson_index}: {manual_e}")

                tasks = [generate_flashcards_and_quiz_for_lesson(lesson, index) for index, lesson in enumerate(lessons)]
                asyncio.create_task(asyncio.gather(*tasks, return_exceptions=True))

            return {
                'lessons': [l.model_dump() for l in lessons],
                'processing_time': processing_time,
                'success': True
            }
        except Exception as e:
            print(f"DSPy parsing failed for lessons: {e}")
            print("Attempting manual parsing...")
            
            # Get the raw response from the error
            if hasattr(e, 'lm_response'):
                raw_response = e.lm_response
                lessons = manual_parse_lessons(raw_response)
                if lessons:
                    print(f"Manual parsing successful! Found {len(lessons)} lessons.")
                    
                    processing_time = time.time() - start_time
                    
                    await db.save_lessons_history(
                        query_id=query_id,
                        lessons_json=json.dumps([l.model_dump() for l in lessons]),
                        processing_time=processing_time
                    )
                    
                    # Schedule flashcard and quiz generation in background with manual parsing fallbacks
                    if lessons:
                        async def generate_flashcards_and_quiz_for_lesson_with_manual_fallback(lesson: Lesson, lesson_index: int):
                            try:
                                start_time_fc = time.time()
                                
                                flashcard_response = await generate_flashcards_module.acall(topic=lesson.model_dump())
                                flashcards = flashcard_response.flashcards.cards
                                
                                processing_time_fc = time.time() - start_time_fc
                                
                                await db.save_flashcards_history(
                                    query_id=query_id,
                                    lesson_index=lesson_index,
                                    lesson_json=lesson.model_dump_json(),
                                    flashcards_json=json.dumps([c.model_dump() for c in flashcards]),
                                    processing_time=processing_time_fc
                                )

                                # Generate quiz
                                start_time_quiz = time.time()
                                quiz_response = await generate_quiz_module.acall(flashcards=flashcard_response.flashcards.model_dump())
                                quiz = quiz_response.quiz
                                processing_time_quiz = time.time() - start_time_quiz

                                await db.save_quiz_history(
                                    query_id=query_id,
                                    lesson_index=lesson_index,
                                    quiz_json=quiz.model_dump_json(),
                                    processing_time=processing_time_quiz
                                )

                            except Exception as e:
                                print(f"Error generating flashcards/quiz for lesson {lesson_index}: {e}")
                                # Try manual parsing for flashcards
                                try:
                                    if hasattr(e, 'lm_response'):
                                        raw_response = e.lm_response
                                        flashcards = manual_parse_flashcards(raw_response)
                                        if flashcards:
                                            print(f"Manual parsing of flashcards successful for lesson {lesson_index}")
                                            processing_time_fc = time.time() - start_time_fc
                                            
                                            await db.save_flashcards_history(
                                                query_id=query_id,
                                                lesson_index=lesson_index,
                                                lesson_json=lesson.model_dump_json(),
                                                flashcards_json=json.dumps([c.model_dump() for c in flashcards]),
                                                processing_time=processing_time_fc
                                            )
                                            
                                            # Try manual parsing for quiz
                                            try:
                                                quiz_response = await generate_quiz_module.acall(flashcards={"cards": [c.model_dump() for c in flashcards]})
                                                quiz = quiz_response.quiz
                                            except Exception as quiz_e:
                                                if hasattr(quiz_e, 'lm_response'):
                                                    quiz = manual_parse_quiz(quiz_e.lm_response)
                                                    if quiz:
                                                        print(f"Manual parsing of quiz successful for lesson {lesson_index}")
                                                        processing_time_quiz = time.time() - start_time_quiz
                                                        await db.save_quiz_history(
                                                            query_id=query_id,
                                                            lesson_index=lesson_index,
                                                            quiz_json=quiz.model_dump_json(),
                                                            processing_time=processing_time_quiz
                                                        )
                                except Exception as manual_e:
                                    print(f"Manual parsing also failed for lesson {lesson_index}: {manual_e}")

                        tasks = [generate_flashcards_and_quiz_for_lesson_with_manual_fallback(lesson, index) for index, lesson in enumerate(lessons)]
                        asyncio.create_task(asyncio.gather(*tasks, return_exceptions=True))
                    
                    return {
                        'lessons': [l.model_dump() for l in lessons],
                        'processing_time': processing_time,
                        'success': True
                    }
                else:
                    print("Manual parsing also failed.")
            else:
                print("No raw response available for manual parsing.")
            
            processing_time = time.time() - start_time
            return {
                'error': str(e),
                'processing_time': processing_time,
                'success': False
            }

# Global task queue instance
# Check if worker count is manually set via environment variable
manual_workers = os.getenv("TASK_QUEUE_WORKERS")
if manual_workers:
    worker_count = int(manual_workers)
    print(f"[TaskQueue] Using manually configured worker count: {worker_count}")
else:
    # Auto-calculate based on CPU cores
    cpu_cores = os.cpu_count() or 2
    if cpu_cores > 4:
        worker_count = cpu_cores // 2
        print(f"[TaskQueue] Detected {cpu_cores} CPU cores, using {worker_count} workers (half of available cores)")
    else:
        worker_count = min(cpu_cores, 4)
        print(f"[TaskQueue] Detected {cpu_cores} CPU cores, using {worker_count} workers (limited to available cores, max 4)")

task_queue = TaskQueue(max_workers=worker_count)