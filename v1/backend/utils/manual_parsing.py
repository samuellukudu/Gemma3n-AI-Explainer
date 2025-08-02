import json
import re
from typing import List, Optional
from backend.dspy_modules import Lesson, RelatedQuestion, Card, TrueFalseQuestion, MultipleChoiceQuestion, Quiz, Flashcards


def manual_parse_lessons(raw_response: str) -> List[Lesson]:
    """Manually parse lessons from LLM response when DSPy parsing fails."""
    try:
        json_str = _extract_json_from_response(raw_response)
        if not json_str:
            print("No JSON found in response for lessons")
            return []
        
        # Parse JSON
        data = json.loads(json_str)
        
        # Extract lessons - try multiple possible structures
        lessons_data = data.get('lessons', [])
        if not lessons_data and isinstance(data, list):
            lessons_data = data
        
        lessons = []
        
        for lesson_data in lessons_data:
            try:
                lesson = Lesson(
                    title=lesson_data.get('title', 'Untitled Lesson'),
                    overview=lesson_data.get('overview', 'No overview provided'),
                    key_concepts=lesson_data.get('key_concepts', []),
                    examples=lesson_data.get('examples', [])
                )
                lessons.append(lesson)
            except Exception as e:
                print(f"Failed to parse individual lesson: {e}")
                print(f"Lesson data: {lesson_data}")
                continue
        
        return lessons
    except Exception as e:
        print(f"Manual parsing of lessons failed: {e}")
        print(f"Raw response preview: {raw_response[:200]}...")
        return []


def manual_parse_related_questions(raw_response: str) -> List[RelatedQuestion]:
    """Manually parse related questions from LLM response when DSPy parsing fails."""
    try:
        json_str = _extract_json_from_response(raw_response)
        if not json_str:
            print("No JSON found in response for related questions")
            return []
        
        # Parse JSON
        data = json.loads(json_str)
        
        # Extract questions - try multiple possible structures
        questions_data = data.get('questions', {}).get('related_questions', [])
        if not questions_data:
            questions_data = data.get('related_questions', [])
        if not questions_data and isinstance(data, list):
            questions_data = data
        
        questions = []
        
        for question_data in questions_data:
            try:
                # Fix common typos in category and validate
                category = question_data.get('category', 'basic').lower().strip()
                if category == 'intermediatate':  # Fix the typo
                    category = 'intermediate'
                elif category not in ['basic', 'intermediate', 'advanced']:
                    # Default to 'basic' for unknown categories
                    print(f"Unknown category '{category}', defaulting to 'basic'")
                    category = 'basic'
                
                question = RelatedQuestion(
                    question=question_data.get('question', 'Unknown question'),
                    category=category,
                    focus_area=question_data.get('focus_area', 'General')
                )
                questions.append(question)
            except Exception as e:
                print(f"Failed to parse individual question: {e}")
                print(f"Question data: {question_data}")
                continue
        
        return questions
    except Exception as e:
        print(f"Manual parsing of related questions failed: {e}")
        print(f"Raw response preview: {raw_response[:200]}...")
        return []


def manual_parse_flashcards(raw_response: str) -> List[Card]:
    """Manually parse flashcards from LLM response when DSPy parsing fails."""
    try:
        json_str = _extract_json_from_response(raw_response)
        if not json_str:
            print("No JSON found in response for flashcards")
            return []
        
        # Parse JSON
        data = json.loads(json_str)
        
        # Extract flashcards - try multiple possible structures
        cards_data = data.get('flashcards', {}).get('cards', [])
        if not cards_data:
            cards_data = data.get('cards', [])
        if not cards_data and isinstance(data, list):
            cards_data = data
        
        cards = []
        
        for card_data in cards_data:
            try:
                card = Card(
                    term=card_data.get('term', 'Unknown term'),
                    explanation=card_data.get('explanation', 'No explanation provided')
                )
                cards.append(card)
            except Exception as e:
                print(f"Failed to parse individual flashcard: {e}")
                print(f"Card data: {card_data}")
                continue
        
        return cards
    except Exception as e:
        print(f"Manual parsing of flashcards failed: {e}")
        print(f"Raw response preview: {raw_response[:200]}...")
        return []


def manual_parse_quiz(raw_response: str) -> Optional[Quiz]:
    """Manually parse quiz from LLM response when DSPy parsing fails."""
    try:
        json_str = _extract_json_from_response(raw_response)
        if not json_str:
            print("No JSON found in response for quiz")
            return None
        
        # Parse JSON
        data = json.loads(json_str)
        
        # Extract quiz data - try multiple possible structures
        quiz_data = data.get('quiz', {})
        if not quiz_data and 'true_false_questions' in data:
            quiz_data = data
        
        # Parse true/false questions
        true_false_questions = []
        for tf_data in quiz_data.get('true_false_questions', []):
            try:
                tf_question = TrueFalseQuestion(
                    question=tf_data.get('question', 'Unknown question'),
                    correct_answer=bool(tf_data.get('correct_answer', False)),
                    explanation=tf_data.get('explanation', 'No explanation provided')
                )
                true_false_questions.append(tf_question)
            except Exception as e:
                print(f"Failed to parse true/false question: {e}")
                print(f"TF data: {tf_data}")
                continue
        
        # Parse multiple choice questions
        multiple_choice_questions = []
        for mc_data in quiz_data.get('multiple_choice_questions', []):
            try:
                # Validate correct_answer index
                correct_answer = mc_data.get('correct_answer', 0)
                options = mc_data.get('options', [])
                if isinstance(correct_answer, int) and 0 <= correct_answer < len(options):
                    mc_question = MultipleChoiceQuestion(
                        question=mc_data.get('question', 'Unknown question'),
                        options=options,
                        correct_answer=correct_answer,
                        explanation=mc_data.get('explanation', 'No explanation provided')
                    )
                    multiple_choice_questions.append(mc_question)
                else:
                    print(f"Invalid correct_answer index {correct_answer} for options {options}")
            except Exception as e:
                print(f"Failed to parse multiple choice question: {e}")
                print(f"MC data: {mc_data}")
                continue
        
        if not true_false_questions and not multiple_choice_questions:
            print("No valid questions found in quiz data")
            return None
        
        quiz = Quiz(
            true_false_questions=true_false_questions,
            multiple_choice_questions=multiple_choice_questions
        )
        
        return quiz
    except Exception as e:
        print(f"Manual parsing of quiz failed: {e}")
        print(f"Raw response preview: {raw_response[:200]}...")
        return None


def _extract_json_from_response(raw_response: str) -> Optional[str]:
    """Extract JSON string from LLM response, handling various formats."""
    if not raw_response:
        return None
    
    try:
        # Method 1: Look for JSON code blocks
        if '```json' in raw_response:
            start = raw_response.find('```json') + 7
            end = raw_response.find('```', start)
            if end != -1:
                return raw_response[start:end].strip()
        
        # Method 2: Look for any code blocks
        if '```' in raw_response:
            # Find first code block
            start = raw_response.find('```')
            if start != -1:
                # Skip the opening ```
                start = raw_response.find('\n', start) + 1
                end = raw_response.find('```', start)
                if end != -1:
                    potential_json = raw_response[start:end].strip()
                    # Check if it looks like JSON
                    if potential_json.startswith('{') and potential_json.endswith('}'):
                        return potential_json
        
        # Method 3: Look for JSON-like content between braces
        brace_start = raw_response.find('{')
        if brace_start != -1:
            # Find the matching closing brace
            brace_count = 0
            for i, char in enumerate(raw_response[brace_start:], brace_start):
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        return raw_response[brace_start:i+1]
        
        # Method 4: Try to extract using regex for JSON-like patterns
        json_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
        matches = re.findall(json_pattern, raw_response, re.DOTALL)
        if matches:
            # Return the longest match (most likely to be complete)
            return max(matches, key=len)
        
        return None
    except Exception as e:
        print(f"Error extracting JSON from response: {e}")
        return None