import aiosqlite
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import json
from pathlib import Path
import os

class Database:
    def __init__(self, db_path: str = "llm_app.db"):
        self.db_path = db_path
        self._lock = asyncio.Lock()
    
    async def init(self):
        """Initialize database tables and ensure schema is up to date"""
        db_exists = os.path.exists(self.db_path)
        async with aiosqlite.connect(self.db_path) as db:
            # Enable WAL mode for better concurrency
            await db.execute("PRAGMA journal_mode=WAL;")
            
            # User sessions table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT UNIQUE NOT NULL,
                    user_id TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT
                )
            """)
            
            # Background tasks table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS background_tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    task_id TEXT UNIQUE NOT NULL,
                    task_type TEXT NOT NULL,
                    status TEXT DEFAULT 'pending',
                    payload TEXT,
                    result TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    completed_at TIMESTAMP,
                    error_message TEXT
                )
            """)
            
            # Lessons history table - simplified to use only query_id
            await db.execute("""
                CREATE TABLE IF NOT EXISTS lessons_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    query_id TEXT UNIQUE NOT NULL,
                    lessons_json TEXT NOT NULL,
                    processing_time REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Related questions history table - simplified to use only query_id
            await db.execute("""
                CREATE TABLE IF NOT EXISTS related_questions_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    query_id TEXT UNIQUE NOT NULL,
                    questions_json TEXT NOT NULL,
                    processing_time REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Flashcards history table - simplified to use only query_id
            await db.execute("""
                CREATE TABLE IF NOT EXISTS flashcards_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    query_id TEXT NOT NULL,
                    lesson_index INTEGER NOT NULL,
                    lesson_json TEXT NOT NULL,
                    flashcards_json TEXT NOT NULL,
                    processing_time REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(query_id, lesson_index)
                )
            """)
            
            # Quizzes history table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS quizzes_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    query_id TEXT NOT NULL,
                    lesson_index INTEGER NOT NULL,
                    quiz_json TEXT NOT NULL,
                    processing_time REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(query_id, lesson_index)
                )
            """)
            
            # Create indexes for better performance
            await db.execute("CREATE INDEX IF NOT EXISTS idx_background_tasks_status ON background_tasks(status)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_lessons_history_query_id ON lessons_history(query_id)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_related_questions_history_query_id ON related_questions_history(query_id)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_flashcards_history_query_id ON flashcards_history(query_id)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_quizzes_history_query_id ON quizzes_history(query_id)")
            
            await db.commit()
    
    async def create_background_task(self, task_id: str, task_type: str, payload: Dict[str, Any]) -> str:
        """Create a new background task"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO background_tasks (task_id, task_type, payload, status)
                VALUES (?, ?, ?, 'pending')
                """,
                (task_id, task_type, json.dumps(payload))
            )
            await db.commit()
            return task_id
    
    async def update_task_status(self, task_id: str, status: str, result: str = None, error_message: str = None):
        """Update background task status"""
        async with aiosqlite.connect(self.db_path) as db:
            completed_at = datetime.now() if status in ['completed', 'failed'] else None
            await db.execute(
                """
                UPDATE background_tasks 
                SET status = ?, result = ?, error_message = ?, completed_at = ?
                WHERE task_id = ?
                """,
                (status, result, error_message, completed_at, task_id)
            )
            await db.commit()
    
    async def get_task_status(self, task_id: str) -> Optional[Dict]:
        """Get background task status"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM background_tasks WHERE task_id = ?",
                (task_id,)
            ) as cursor:
                row = await cursor.fetchone()
                return dict(row) if row else None
    
    async def get_pending_tasks(self) -> List[Dict]:
        """Get all pending or processing tasks for recovery on startup"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM background_tasks WHERE status IN ('pending', 'processing')"
            ) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]

    async def save_lessons_history(self, query_id: str, lessons_json: str, processing_time: float = None):
        """Save generated lessons to lessons_history table"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT OR REPLACE INTO lessons_history (query_id, lessons_json, processing_time)
                VALUES (?, ?, ?)
                """,
                (query_id, lessons_json, processing_time)
            )
            await db.commit()

    async def save_related_questions_history(self, query_id: str, questions_json: str, processing_time: float = None):
        """Save generated related questions to related_questions_history table"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT OR REPLACE INTO related_questions_history (query_id, questions_json, processing_time)
                VALUES (?, ?, ?)
                """,
                (query_id, questions_json, processing_time)
            )
            await db.commit()

    async def save_flashcards_history(self, query_id: str, lesson_index: int, lesson_json: str, flashcards_json: str, processing_time: float = None):
        """Save generated flashcards to flashcards_history table"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT OR REPLACE INTO flashcards_history (query_id, lesson_index, lesson_json, flashcards_json, processing_time)
                VALUES (?, ?, ?, ?, ?)
                """,
                (query_id, lesson_index, lesson_json, flashcards_json, processing_time)
            )
            await db.commit()

    async def save_quiz_history(self, query_id: str, lesson_index: int, quiz_json: str, processing_time: float = None):
        """Save generated quiz to quizzes_history table"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT OR REPLACE INTO quizzes_history (query_id, lesson_index, quiz_json, processing_time)
                VALUES (?, ?, ?, ?)
                """,
                (query_id, lesson_index, quiz_json, processing_time)
            )
            await db.commit()

    async def get_lessons_by_query_id(self, query_id: str) -> Optional[Dict]:
        """Get lessons by query_id"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM lessons_history WHERE query_id = ?",
                (query_id,)
            ) as cursor:
                row = await cursor.fetchone()
                return dict(row) if row else None

    async def get_related_questions_by_query_id(self, query_id: str) -> Optional[Dict]:
        """Get related questions by query_id"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM related_questions_history WHERE query_id = ?",
                (query_id,)
            ) as cursor:
                row = await cursor.fetchone()
                return dict(row) if row else None

    async def get_flashcards_by_query_id(self, query_id: str) -> List[Dict]:
        """Get all flashcards for a given query_id"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM flashcards_history WHERE query_id = ? ORDER BY lesson_index ASC",
                (query_id,)
            ) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]

    async def get_flashcards_by_query_id_and_lesson_index(self, query_id: str, lesson_index: int) -> Optional[Dict]:
        """Get flashcards by query_id and lesson_index"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM flashcards_history WHERE query_id = ? AND lesson_index = ?",
                (query_id, lesson_index)
            ) as cursor:
                row = await cursor.fetchone()
                return dict(row) if row else None

    async def get_quiz_by_query_id_and_lesson_index(self, query_id: str, lesson_index: int) -> Optional[Dict]:
        """Get quiz by query_id and lesson_index"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM quizzes_history WHERE query_id = ? AND lesson_index = ?",
                (query_id, lesson_index)
            ) as cursor:
                row = await cursor.fetchone()
                return dict(row) if row else None

    async def get_recent_lessons(self, limit: int = 50) -> List[Dict]:
        """Get recent lessons history"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM lessons_history ORDER BY created_at DESC LIMIT ?",
                (limit,)
            ) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]

    async def get_recent_related_questions(self, limit: int = 50) -> List[Dict]:
        """Get recent related questions history"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM related_questions_history ORDER BY created_at DESC LIMIT ?",
                (limit,)
            ) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]

    async def get_recent_flashcards(self, limit: int = 50) -> List[Dict]:
        """Get recent flashcards history"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM flashcards_history ORDER BY created_at DESC LIMIT ?",
                (limit,)
            ) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]

# Global database instance
db = Database()