import json
from typing import List, Optional
from backend.dspy_modules import Lesson, RelatedQuestion, Card, TrueFalseQuestion, MultipleChoiceQuestion, Quiz, Flashcards


def manual_parse_lessons(raw_response: str) -> List[Lesson]:
    """Manually parse lessons from LLM response when DSPy parsing fails."""
    try:
        # Extract JSON from the response (remove markdown code blocks)
        if '```json' in raw_response:
            start = raw_response.find('```json') + 7
            end = raw_response.find('```', start)
            json_str = raw_response[start:end].strip()
        else:
            # Try to find JSON in the response
            start = raw_response.find('{')
            end = raw_response.rfind('}') + 1
            json_str = raw_response[start:end]
        
        # Parse JSON
        data = json.loads(json_str)
        
        # Extract lessons
        lessons_data = data.get('lessons', [])
        lessons = []
        
        for lesson_data in lessons_data:
            lesson = Lesson(
                title=lesson_data['title'],
                overview=lesson_data['overview'],
                key_concepts=lesson_data['key_concepts'],
                examples=lesson_data['examples']
            )
            lessons.append(lesson)
        
        return lessons
    except Exception as e:
        print(f"Manual parsing of lessons failed: {e}")
        return []


def manual_parse_related_questions(raw_response: str) -> List[RelatedQuestion]:
    """Manually parse related questions from LLM response when DSPy parsing fails."""
    try:
        # Extract JSON from the response (remove markdown code blocks)
        if '```json' in raw_response:
            start = raw_response.find('```json') + 7
            end = raw_response.find('```', start)
            json_str = raw_response[start:end].strip()
        else:
            # Try to find JSON in the response
            start = raw_response.find('{')
            end = raw_response.rfind('}') + 1
            json_str = raw_response[start:end]
        
        # Parse JSON
        data = json.loads(json_str)
        
        # Extract questions
        questions_data = data.get('questions', {}).get('related_questions', [])
        if not questions_data:
            # Try alternative structure
            questions_data = data.get('related_questions', [])
        
        questions = []
        
        for question_data in questions_data:
            try:
                # Fix common typos in category
                category = question_data['category'].lower().strip()
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
                # Skip this question but continue with others
                continue
        
        return questions
    except Exception as e:
        print(f"Manual parsing of related questions failed: {e}")
        return []


def manual_parse_flashcards(raw_response: str) -> List[Card]:
    """Manually parse flashcards from LLM response when DSPy parsing fails."""
    try:
        # Extract JSON from the response (remove markdown code blocks)
        if '```json' in raw_response:
            start = raw_response.find('```json') + 7
            end = raw_response.find('```', start)
            json_str = raw_response[start:end].strip()
        else:
            # Try to find JSON in the response
            start = raw_response.find('{')
            end = raw_response.rfind('}') + 1
            json_str = raw_response[start:end]
        
        # Parse JSON
        data = json.loads(json_str)
        
        # Extract flashcards
        cards_data = data.get('flashcards', {}).get('cards', [])
        if not cards_data:
            # Try alternative structure
            cards_data = data.get('cards', [])
        
        cards = []
        
        for card_data in cards_data:
            card = Card(
                term=card_data['term'],
                explanation=card_data['explanation']
            )
            cards.append(card)
        
        return cards
    except Exception as e:
        print(f"Manual parsing of flashcards failed: {e}")
        return []


def manual_parse_quiz(raw_response: str) -> Optional[Quiz]:
    """Manually parse quiz from LLM response when DSPy parsing fails."""
    try:
        # Extract JSON from the response (remove markdown code blocks)
        if '```json' in raw_response:
            start = raw_response.find('```json') + 7
            end = raw_response.find('```', start)
            json_str = raw_response[start:end].strip()
        else:
            # Try to find JSON in the response
            start = raw_response.find('{')
            end = raw_response.rfind('}') + 1
            json_str = raw_response[start:end]
        
        # Parse JSON
        data = json.loads(json_str)
        
        # Extract quiz data
        quiz_data = data.get('quiz', {})
        
        # Parse true/false questions
        true_false_questions = []
        for tf_data in quiz_data.get('true_false_questions', []):
            tf_question = TrueFalseQuestion(
                question=tf_data['question'],
                correct_answer=tf_data['correct_answer'],
                explanation=tf_data['explanation']
            )
            true_false_questions.append(tf_question)
        
        # Parse multiple choice questions
        multiple_choice_questions = []
        for mc_data in quiz_data.get('multiple_choice_questions', []):
            mc_question = MultipleChoiceQuestion(
                question=mc_data['question'],
                options=mc_data['options'],
                correct_answer=mc_data['correct_answer'],
                explanation=mc_data['explanation']
            )
            multiple_choice_questions.append(mc_question)
        
        quiz = Quiz(
            true_false_questions=true_false_questions,
            multiple_choice_questions=multiple_choice_questions
        )
        
        return quiz
    except Exception as e:
        print(f"Manual parsing of quiz failed: {e}")
        return None 