#!/usr/bin/env python3
"""
Database Query Tool for Learning Database

This program provides an interactive interface to query the learning.db database
created by the DSPy application. It allows users to explore topics, lessons,
flashcards, and quizzes stored in the database.
"""

import sqlite3
import sys
import os
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import json

DB_PATH = 'learning.db'

@dataclass
class Topic:
    id: str
    name: str

@dataclass
class RelatedQuestion:
    id: int
    topic_id: str
    question: str
    category: str
    focus_area: str

@dataclass
class Lesson:
    id: int
    topic_id: str
    title: str
    overview: str
    key_concepts: List[str]
    examples: List[str]

@dataclass
class Flashcard:
    id: int
    lesson_id: int
    term: str
    explanation: str

@dataclass
class Quiz:
    id: int
    flashcard_set_id: int
    type: str
    question: str
    options: List[str]
    correct_answer: str
    explanation: str

class LearningDBQuery:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self.conn = None
        self.cursor = None
        
    def connect(self):
        """Connect to the database."""
        if not os.path.exists(self.db_path):
            print(f"Error: Database file '{self.db_path}' not found!")
            print("Please run the DSPy application first to create the database.")
            sys.exit(1)
        
        try:
            self.conn = sqlite3.connect(self.db_path)
            self.cursor = self.conn.cursor()
            print(f"Connected to database: {self.db_path}")
        except sqlite3.Error as e:
            print(f"Error connecting to database: {e}")
            sys.exit(1)
    
    def disconnect(self):
        """Disconnect from the database."""
        if self.conn:
            self.conn.close()
    
    def get_all_topics(self) -> List[Topic]:
        """Get all topics from the database."""
        self.cursor.execute("SELECT id, name FROM topics ORDER BY name")
        rows = self.cursor.fetchall()
        return [Topic(id=row[0], name=row[1]) for row in rows]
    
    def get_topic_by_id(self, topic_id: str) -> Optional[Topic]:
        """Get a specific topic by ID."""
        self.cursor.execute("SELECT id, name FROM topics WHERE id = ?", (topic_id,))
        row = self.cursor.fetchone()
        return Topic(id=row[0], name=row[1]) if row else None
    
    def get_topic_by_name(self, topic_name: str) -> Optional[Topic]:
        """Get a specific topic by name."""
        self.cursor.execute("SELECT id, name FROM topics WHERE name LIKE ?", (f"%{topic_name}%",))
        row = self.cursor.fetchone()
        return Topic(id=row[0], name=row[1]) if row else None
    
    def get_related_questions(self, topic_id: str) -> List[RelatedQuestion]:
        """Get all related questions for a topic."""
        self.cursor.execute("""
            SELECT id, topic_id, question, category, focus_area 
            FROM related_questions 
            WHERE topic_id = ? 
            ORDER BY category, id
        """, (topic_id,))
        rows = self.cursor.fetchall()
        return [RelatedQuestion(id=row[0], topic_id=row[1], question=row[2], 
                              category=row[3], focus_area=row[4]) for row in rows]
    
    def get_lessons(self, topic_id: str) -> List[Lesson]:
        """Get all lessons for a topic."""
        self.cursor.execute("""
            SELECT id, topic_id, title, overview, key_concepts, examples 
            FROM lessons 
            WHERE topic_id = ? 
            ORDER BY id
        """, (topic_id,))
        rows = self.cursor.fetchall()
        lessons = []
        for row in rows:
            key_concepts = row[4].split(',') if row[4] else []
            examples = row[5].split(',') if row[5] else []
            lessons.append(Lesson(
                id=row[0], topic_id=row[1], title=row[2], overview=row[3],
                key_concepts=key_concepts, examples=examples
            ))
        return lessons
    
    def get_flashcards(self, lesson_id: int) -> List[Flashcard]:
        """Get all flashcards for a lesson."""
        self.cursor.execute("""
            SELECT id, lesson_id, term, explanation 
            FROM flashcards 
            WHERE lesson_id = ? 
            ORDER BY id
        """, (lesson_id,))
        rows = self.cursor.fetchall()
        return [Flashcard(id=row[0], lesson_id=row[1], term=row[2], 
                         explanation=row[3]) for row in rows]
    
    def get_quizzes(self, flashcard_set_id: int) -> List[Quiz]:
        """Get all quizzes for a flashcard set."""
        self.cursor.execute("""
            SELECT id, flashcard_set_id, type, question, options, correct_answer, explanation 
            FROM quizzes 
            WHERE flashcard_set_id = ? 
            ORDER BY type, id
        """, (flashcard_set_id,))
        rows = self.cursor.fetchall()
        quizzes = []
        for row in rows:
            options = row[4].split(',') if row[4] else []
            quizzes.append(Quiz(
                id=row[0], flashcard_set_id=row[1], type=row[2], question=row[3],
                options=options, correct_answer=row[5], explanation=row[6]
            ))
        return quizzes
    
    def get_database_stats(self) -> Dict[str, int]:
        """Get database statistics."""
        stats = {}
        tables = ['topics', 'related_questions', 'lessons', 'flashcards', 'quizzes']
        
        for table in tables:
            self.cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = self.cursor.fetchone()[0]
            stats[table] = count
        
        return stats
    
    def search_topics(self, search_term: str) -> List[Topic]:
        """Search topics by name."""
        self.cursor.execute("SELECT id, name FROM topics WHERE name LIKE ? ORDER BY name", 
                           (f"%{search_term}%",))
        rows = self.cursor.fetchall()
        return [Topic(id=row[0], name=row[1]) for row in rows]
    
    def search_questions(self, search_term: str) -> List[RelatedQuestion]:
        """Search questions by content."""
        self.cursor.execute("""
            SELECT id, topic_id, question, category, focus_area 
            FROM related_questions 
            WHERE question LIKE ? OR focus_area LIKE ?
            ORDER BY category, id
        """, (f"%{search_term}%", f"%{search_term}%"))
        rows = self.cursor.fetchall()
        return [RelatedQuestion(id=row[0], topic_id=row[1], question=row[2], 
                              category=row[3], focus_area=row[4]) for row in rows]

class InteractiveQueryInterface:
    def __init__(self):
        self.db = LearningDBQuery()
        self.db.connect()
    
    def display_menu(self):
        """Display the main menu."""
        print("\n" + "="*60)
        print("           LEARNING DATABASE QUERY TOOL")
        print("="*60)
        print("1. View all topics")
        print("2. Search topics")
        print("3. View topic details (questions, lessons, flashcards, quizzes)")
        print("4. Search questions")
        print("5. View database statistics")
        print("6. Interactive quiz mode")
        print("7. Export topic data")
        print("0. Exit")
        print("-"*60)
    
    def display_topics(self):
        """Display all topics."""
        topics = self.db.get_all_topics()
        if not topics:
            print("No topics found in the database.")
            return
        
        print(f"\nFound {len(topics)} topics:")
        print("-" * 40)
        for i, topic in enumerate(topics, 1):
            print(f"{i:2d}. {topic.name}")
    
    def search_topics(self):
        """Search for topics."""
        search_term = input("\nEnter search term: ").strip()
        if not search_term:
            print("Search term cannot be empty.")
            return
        
        topics = self.db.search_topics(search_term)
        if not topics:
            print(f"No topics found matching '{search_term}'.")
            return
        
        print(f"\nFound {len(topics)} topics matching '{search_term}':")
        print("-" * 50)
        for i, topic in enumerate(topics, 1):
            print(f"{i:2d}. {topic.name}")
    
    def display_topic_details(self):
        """Display detailed information for a topic."""
        # First show all topics
        topics = self.db.get_all_topics()
        if not topics:
            print("No topics found in the database.")
            return
        
        print("\nAvailable topics:")
        for i, topic in enumerate(topics, 1):
            print(f"{i:2d}. {topic.name}")
        
        try:
            choice = int(input("\nEnter topic number: ")) - 1
            if choice < 0 or choice >= len(topics):
                print("Invalid choice.")
                return
            
            selected_topic = topics[choice]
            self._show_topic_details(selected_topic)
            
        except ValueError:
            print("Please enter a valid number.")
    
    def _show_topic_details(self, topic: Topic):
        """Show detailed information for a specific topic."""
        print(f"\n{'='*60}")
        print(f"TOPIC: {topic.name}")
        print(f"{'='*60}")
        
        # Get related questions
        questions = self.db.get_related_questions(topic.id)
        print(f"\n📝 RELATED QUESTIONS ({len(questions)}):")
        print("-" * 40)
        for i, q in enumerate(questions, 1):
            print(f"{i}. [{q.category.upper()}] {q.question}")
            print(f"   Focus: {q.focus_area}")
            print()
        
        # Get lessons
        lessons = self.db.get_lessons(topic.id)
        print(f"\n📚 LESSONS ({len(lessons)}):")
        print("-" * 40)
        for i, lesson in enumerate(lessons, 1):
            print(f"{i}. {lesson.title}")
            print(f"   Overview: {lesson.overview}")
            print(f"   Key Concepts: {', '.join(lesson.key_concepts)}")
            print(f"   Examples: {', '.join(lesson.examples)}")
            print()
            
            # Get flashcards for this lesson
            flashcards = self.db.get_flashcards(lesson.id)
            print(f"   📋 FLASHCARDS ({len(flashcards)}):")
            for j, card in enumerate(flashcards, 1):
                print(f"      {j}. {card.term}: {card.explanation}")
            print()
            
            # Get quizzes for this lesson
            if flashcards:
                first_flashcard_id = flashcards[0].id
                quizzes = self.db.get_quizzes(first_flashcard_id)
                if quizzes:
                    print(f"   🎯 QUIZZES ({len(quizzes)}):")
                    for j, quiz in enumerate(quizzes, 1):
                        print(f"      {j}. [{quiz.type.upper()}] {quiz.question}")
                        if quiz.type == 'multiple_choice' and quiz.options:
                            for k, option in enumerate(quiz.options, 1):
                                print(f"         {k}. {option}")
                        print(f"         Answer: {quiz.correct_answer}")
                        print(f"         Explanation: {quiz.explanation}")
                        print()
    
    def search_questions(self):
        """Search for questions."""
        search_term = input("\nEnter search term: ").strip()
        if not search_term:
            print("Search term cannot be empty.")
            return
        
        questions = self.db.search_questions(search_term)
        if not questions:
            print(f"No questions found matching '{search_term}'.")
            return
        
        print(f"\nFound {len(questions)} questions matching '{search_term}':")
        print("-" * 60)
        for i, q in enumerate(questions, 1):
            topic = self.db.get_topic_by_id(q.topic_id)
            topic_name = topic.name if topic else "Unknown Topic"
            print(f"{i:2d}. [{q.category.upper()}] {q.question}")
            print(f"    Topic: {topic_name}")
            print(f"    Focus: {q.focus_area}")
            print()
    
    def display_stats(self):
        """Display database statistics."""
        stats = self.db.get_database_stats()
        print("\n📊 DATABASE STATISTICS:")
        print("-" * 30)
        for table, count in stats.items():
            print(f"{table.replace('_', ' ').title()}: {count}")
    
    def interactive_quiz_mode(self):
        """Interactive quiz mode."""
        topics = self.db.get_all_topics()
        if not topics:
            print("No topics found in the database.")
            return
        
        print("\nAvailable topics for quiz:")
        for i, topic in enumerate(topics, 1):
            print(f"{i:2d}. {topic.name}")
        
        try:
            choice = int(input("\nEnter topic number: ")) - 1
            if choice < 0 or choice >= len(topics):
                print("Invalid choice.")
                return
            
            selected_topic = topics[choice]
            self._run_quiz(selected_topic)
            
        except ValueError:
            print("Please enter a valid number.")
    
    def _run_quiz(self, topic: Topic):
        """Run an interactive quiz for a topic."""
        lessons = self.db.get_lessons(topic.id)
        if not lessons:
            print(f"No lessons found for topic: {topic.name}")
            return
        
        print(f"\n🎯 QUIZ MODE: {topic.name}")
        print("=" * 50)
        
        total_questions = 0
        correct_answers = 0
        
        for lesson in lessons:
            flashcards = self.db.get_flashcards(lesson.id)
            if not flashcards:
                continue
            
            first_flashcard_id = flashcards[0].id
            quizzes = self.db.get_quizzes(first_flashcard_id)
            
            if not quizzes:
                continue
            
            print(f"\n📚 Lesson: {lesson.title}")
            print("-" * 30)
            
            for quiz in quizzes:
                total_questions += 1
                print(f"\nQuestion {total_questions}: {quiz.question}")
                
                if quiz.type == 'true_false':
                    print("Options: True / False")
                    answer = input("Your answer (true/false): ").strip().lower()
                    correct = answer == quiz.correct_answer.lower()
                elif quiz.type == 'multiple_choice':
                    for i, option in enumerate(quiz.options, 1):
                        print(f"  {i}. {option}")
                    try:
                        answer = int(input("Your answer (1-4): ")) - 1
                        correct = str(answer) == quiz.correct_answer
                    except ValueError:
                        correct = False
                        answer = "Invalid"
                else:
                    continue
                
                if correct:
                    correct_answers += 1
                    print("✅ Correct!")
                else:
                    print("❌ Incorrect!")
                
                print(f"Explanation: {quiz.explanation}")
                print()
        
        if total_questions > 0:
            score = (correct_answers / total_questions) * 100
            print(f"\n🎉 QUIZ COMPLETED!")
            print(f"Score: {correct_answers}/{total_questions} ({score:.1f}%)")
        else:
            print("No quiz questions found for this topic.")
    
    def export_topic_data(self):
        """Export topic data to JSON."""
        topics = self.db.get_all_topics()
        if not topics:
            print("No topics found in the database.")
            return
        
        print("\nAvailable topics for export:")
        for i, topic in enumerate(topics, 1):
            print(f"{i:2d}. {topic.name}")
        
        try:
            choice = int(input("\nEnter topic number: ")) - 1
            if choice < 0 or choice >= len(topics):
                print("Invalid choice.")
                return
            
            selected_topic = topics[choice]
            filename = input(f"Enter filename for export (default: {selected_topic.name.replace(' ', '_')}.json): ").strip()
            if not filename:
                filename = f"{selected_topic.name.replace(' ', '_')}.json"
            
            if not filename.endswith('.json'):
                filename += '.json'
            
            self._export_topic_to_json(selected_topic, filename)
            
        except ValueError:
            print("Please enter a valid number.")
    
    def _export_topic_to_json(self, topic: Topic, filename: str):
        """Export a topic's data to JSON file."""
        try:
            data = {
                "topic": {
                    "id": topic.id,
                    "name": topic.name
                },
                "related_questions": [],
                "lessons": []
            }
            
            # Get related questions
            questions = self.db.get_related_questions(topic.id)
            for q in questions:
                data["related_questions"].append({
                    "question": q.question,
                    "category": q.category,
                    "focus_area": q.focus_area
                })
            
            # Get lessons with flashcards and quizzes
            lessons = self.db.get_lessons(topic.id)
            for lesson in lessons:
                lesson_data = {
                    "title": lesson.title,
                    "overview": lesson.overview,
                    "key_concepts": lesson.key_concepts,
                    "examples": lesson.examples,
                    "flashcards": [],
                    "quizzes": []
                }
                
                # Get flashcards
                flashcards = self.db.get_flashcards(lesson.id)
                for card in flashcards:
                    lesson_data["flashcards"].append({
                        "term": card.term,
                        "explanation": card.explanation
                    })
                
                # Get quizzes
                if flashcards:
                    first_flashcard_id = flashcards[0].id
                    quizzes = self.db.get_quizzes(first_flashcard_id)
                    for quiz in quizzes:
                        quiz_data = {
                            "type": quiz.type,
                            "question": quiz.question,
                            "options": quiz.options,
                            "correct_answer": quiz.correct_answer,
                            "explanation": quiz.explanation
                        }
                        lesson_data["quizzes"].append(quiz_data)
                
                data["lessons"].append(lesson_data)
            
            # Write to file
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            print(f"✅ Data exported successfully to: {filename}")
            
        except Exception as e:
            print(f"Error exporting data: {e}")
    
    def run(self):
        """Run the interactive interface."""
        print("Welcome to the Learning Database Query Tool!")
        
        while True:
            try:
                self.display_menu()
                choice = input("Enter your choice (0-7): ").strip()
                
                if choice == '0':
                    print("Goodbye!")
                    break
                elif choice == '1':
                    self.display_topics()
                elif choice == '2':
                    self.search_topics()
                elif choice == '3':
                    self.display_topic_details()
                elif choice == '4':
                    self.search_questions()
                elif choice == '5':
                    self.display_stats()
                elif choice == '6':
                    self.interactive_quiz_mode()
                elif choice == '7':
                    self.export_topic_data()
                else:
                    print("Invalid choice. Please enter a number between 0 and 7.")
                
                input("\nPress Enter to continue...")
                
            except KeyboardInterrupt:
                print("\n\nGoodbye!")
                break
            except Exception as e:
                print(f"An error occurred: {e}")
                input("Press Enter to continue...")
        
        self.db.disconnect()

def main():
    """Main function."""
    if len(sys.argv) > 1:
        # Command line mode
        db = LearningDBQuery()
        db.connect()
        
        command = sys.argv[1].lower()
        
        if command == 'topics':
            topics = db.get_all_topics()
            print(f"Found {len(topics)} topics:")
            for topic in topics:
                print(f"- {topic.name}")
        
        elif command == 'stats':
            stats = db.get_database_stats()
            print("Database Statistics:")
            for table, count in stats.items():
                print(f"{table}: {count}")
        
        elif command == 'search' and len(sys.argv) > 2:
            search_term = sys.argv[2]
            topics = db.search_topics(search_term)
            print(f"Found {len(topics)} topics matching '{search_term}':")
            for topic in topics:
                print(f"- {topic.name}")
        
        else:
            print("Usage:")
            print("  python db_query.py                    # Interactive mode")
            print("  python db_query.py topics             # List all topics")
            print("  python db_query.py stats              # Show database stats")
            print("  python db_query.py search <term>      # Search topics")
        
        db.disconnect()
    else:
        # Interactive mode
        interface = InteractiveQueryInterface()
        interface.run()

if __name__ == "__main__":
    main() 