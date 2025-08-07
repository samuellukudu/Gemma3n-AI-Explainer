10:23:02 - LiteLLM:INFO: utils.py:1262 - Wrapper: Completed Call, calling success_handler
INFO:LiteLLM:Wrapper: Completed Call, calling success_handler
WARNING:backend.profiler:[BLOCKING DETECTED] task_queue.process_query_lessons: CPU time 0.112s > threshold 0.1s
ERROR:asyncio:Task exception was never retrieved
future: <Task finished name='Task-18866' coro=<TaskQueue._process_query_lessons_task.<locals>.generate_flashcards_and_quiz_for_lesson() done, defined at /Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/backend/task_queue.py:411> exception=OperationalError('unable to open database file')>
Traceback (most recent call last):
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/backend/task_queue.py", line 413, in generate_flashcards_and_quiz_for_lesson
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/backend/cache.py", line 266, in create_flashcards_placeholder
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/backend/database.py", line 276, in create_flashcards_placeholder
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/.venv/lib/python3.11/site-packages/aiosqlite/core.py", line 143, in __aenter__
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/.venv/lib/python3.11/site-packages/aiosqlite/core.py", line 130, in _connect
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/.venv/lib/python3.11/site-packages/aiosqlite/core.py", line 105, in run
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/.venv/lib/python3.11/site-packages/aiosqlite/core.py", line 382, in connector
sqlite3.OperationalError: unable to open database file
ERROR:asyncio:Task exception was never retrieved
future: <Task finished name='Task-18867' coro=<TaskQueue._process_query_lessons_task.<locals>.generate_flashcards_and_quiz_for_lesson() done, defined at /Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/backend/task_queue.py:411> exception=OperationalError('unable to open database file')>
Traceback (most recent call last):
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/backend/task_queue.py", line 413, in generate_flashcards_and_quiz_for_lesson
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/backend/cache.py", line 266, in create_flashcards_placeholder
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/backend/database.py", line 276, in create_flashcards_placeholder
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/.venv/lib/python3.11/site-packages/aiosqlite/core.py", line 143, in __aenter__
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/.venv/lib/python3.11/site-packages/aiosqlite/core.py", line 130, in _connect
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/.venv/lib/python3.11/site-packages/aiosqlite/core.py", line 105, in run
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/.venv/lib/python3.11/site-packages/aiosqlite/core.py", line 382, in connector
sqlite3.OperationalError: unable to open database file
ERROR:asyncio:Task exception was never retrieved
future: <Task finished name='Task-18863' coro=<TaskQueue._process_query_lessons_task.<locals>.generate_flashcards_and_quiz_for_lesson() done, defined at /Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/backend/task_queue.py:411> exception=OperationalError('unable to open database file')>
Traceback (most recent call last):
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/backend/task_queue.py", line 413, in generate_flashcards_and_quiz_for_lesson
    await db.create_flashcards_placeholder(query_id, lesson_index, lesson.model_dump_json())
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/backend/cache.py", line 266, in create_flashcards_placeholder
    return await self.db.create_flashcards_placeholder(query_id, lesson_index, lesson_json)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/backend/database.py", line 277, in create_flashcards_placeholder
    await db.execute(
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/.venv/lib/python3.11/site-packages/aiosqlite/core.py", line 183, in execute
    cursor = await self._execute(self._conn.execute, sql, parameters)
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/.venv/lib/python3.11/site-packages/aiosqlite/core.py", line 122, in _execute
    return await future
           ^^^^^^^^^^^^
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/.venv/lib/python3.11/site-packages/aiosqlite/core.py", line 105, in run
    result = function()
             ^^^^^^^^^^
sqlite3.OperationalError: unable to open database file
ERROR:asyncio:Task exception was never retrieved
future: <Task finished name='Task-18864' coro=<TaskQueue._process_query_lessons_task.<locals>.generate_flashcards_and_quiz_for_lesson() done, defined at /Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/backend/task_queue.py:411> exception=OperationalError('unable to open database file')>
Traceback (most recent call last):
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/backend/task_queue.py", line 413, in generate_flashcards_and_quiz_for_lesson
    await db.create_flashcards_placeholder(query_id, lesson_index, lesson.model_dump_json())
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/backend/cache.py", line 266, in create_flashcards_placeholder
    return await self.db.create_flashcards_placeholder(query_id, lesson_index, lesson_json)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/backend/database.py", line 277, in create_flashcards_placeholder
    await db.execute(
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/.venv/lib/python3.11/site-packages/aiosqlite/core.py", line 183, in execute
    cursor = await self._execute(self._conn.execute, sql, parameters)
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/.venv/lib/python3.11/site-packages/aiosqlite/core.py", line 122, in _execute
    return await future
           ^^^^^^^^^^^^
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/.venv/lib/python3.11/site-packages/aiosqlite/core.py", line 105, in run
    result = function()
             ^^^^^^^^^^
sqlite3.OperationalError: unable to open database file
ERROR:asyncio:Task exception was never retrieved
future: <Task finished name='Task-18865' coro=<TaskQueue._process_query_lessons_task.<locals>.generate_flashcards_and_quiz_for_lesson() done, defined at /Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/backend/task_queue.py:411> exception=OperationalError('unable to open database file')>
Traceback (most recent call last):
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/backend/task_queue.py", line 413, in generate_flashcards_and_quiz_for_lesson
    await db.create_flashcards_placeholder(query_id, lesson_index, lesson.model_dump_json())
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/backend/cache.py", line 266, in create_flashcards_placeholder
    return await self.db.create_flashcards_placeholder(query_id, lesson_index, lesson_json)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/backend/database.py", line 277, in create_flashcards_placeholder
    await db.execute(
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/.venv/lib/python3.11/site-packages/aiosqlite/core.py", line 183, in execute
    cursor = await self._execute(self._conn.execute, sql, parameters)
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/.venv/lib/python3.11/site-packages/aiosqlite/core.py", line 122, in _execute
    return await future
           ^^^^^^^^^^^^
  File "/Users/samuellukudu/STARTUPS/Gemma3n-AI-Explainer/v1/.venv/lib/python3.11/site-packages/aiosqlite/core.py", line 105, in run
    result = function()
             ^^^^^^^^^^
sqlite3.OperationalError: unable to open database file
