# Learning Database Query Tool

This tool provides an interactive interface to query and explore the `learning.db` database created by the DSPy application.

## Features

- **View all topics** - Browse all topics in the database
- **Search topics** - Search for topics by name
- **Topic details** - View complete information for a topic including:
  - Related questions (basic, intermediate, advanced)
  - Lessons with overview, key concepts, and examples
  - Flashcards for each lesson
  - Quizzes (true/false and multiple choice)
- **Search questions** - Search through all questions by content
- **Database statistics** - View counts of all database tables
- **Interactive quiz mode** - Take quizzes for any topic
- **Export data** - Export topic data to JSON format

## Usage

### Interactive Mode (Recommended)

```bash
python db_query.py
```

This launches an interactive menu-driven interface where you can:
- Navigate through topics and lessons
- Take interactive quizzes
- Search for specific content
- Export data

### Command Line Mode

```bash
# List all topics
python db_query.py topics

# Show database statistics
python db_query.py stats

# Search for topics
python db_query.py search "solar panels"
```

## Database Structure

The tool works with the following database tables:

- **topics** - Main topics with UUID identifiers
- **related_questions** - Questions categorized by difficulty level
- **lessons** - Educational content with key concepts and examples
- **flashcards** - Key terms and definitions for each lesson
- **quizzes** - Assessment questions (true/false and multiple choice)

## Requirements

- Python 3.7+
- SQLite3 (included with Python)
- The `learning.db` file created by `dspy_app.py`

## Example Output

```
============================================================
           LEARNING DATABASE QUERY TOOL
============================================================
1. View all topics
2. Search topics
3. View topic details (questions, lessons, flashcards, quizzes)
4. Search questions
5. View database statistics
6. Interactive quiz mode
7. Export topic data
0. Exit
------------------------------------------------------------
Enter your choice (0-7): 1

Found 1 topics:
 1. How do solar panels work?
```

## Quiz Mode

The interactive quiz mode allows you to:
- Select a topic
- Answer true/false and multiple choice questions
- Get immediate feedback and explanations
- See your final score

## Export Feature

You can export any topic's complete data to JSON format, including:
- Topic information
- All related questions
- Lessons with key concepts and examples
- Flashcards with definitions
- Quiz questions and answers

This is useful for:
- Backing up data
- Sharing content
- Further analysis
- Integration with other tools 