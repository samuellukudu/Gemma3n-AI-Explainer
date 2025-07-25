import os
import dspy
from typing import Literal, List, Union
from pydantic import BaseModel, Field, field_validator
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure DSPy language model
try:
    lm = dspy.LM(
        f"openai/{os.getenv('MODEL')}",
        api_key=os.getenv("API_KEY"),
        api_base=os.getenv("BASE_URL")
    )
    dspy.configure(lm=lm)
except Exception as e:
    print(f"Failed to configure DSPy LM: {e}")
    # Fallback or default configuration can be added here if needed
    lm = None

# --- Pydantic Models for Structured Output ---

class RelatedQuestion(BaseModel):
    """Represents a single generated question."""
    question: str = Field(description="The actual question text")
    category: Literal["basic", "intermediate", "advanced"] = Field(description="The category of the question")
    focus_area: str = Field(description="Brief description of what aspect this question explores")

class RelatedQuestionsSet(BaseModel):
    """Represents a list of related questions."""
    related_questions: List[RelatedQuestion] = Field(description="A list of related questions")

class Lesson(BaseModel):
    """Represents a single lesson."""
    title: str = Field(description="The title of the lesson")
    overview: str = Field(description="A brief overview of what the lesson covers")
    key_concepts: List[str] = Field(description="A list of key concepts covered in the lesson")
    examples: List[str] = Field(description="A list of practical examples or applications")

class LessonsSet(BaseModel):
    """Represents a list of lessons."""
    lessons: List[Lesson] = Field(description="A list of lessons")

    @field_validator('lessons', mode='before')
    @classmethod
    def unwrap_lessons(cls, v):
        if v and isinstance(v, list) and isinstance(v[0], dict) and "Lesson" in v[0]:
            return [item["Lesson"] for item in v]
        return v

class Card(BaseModel):
    """A single card defining a key term or concept."""
    term: str = Field(description="The term or concept to be defined")
    explanation: str = Field(description="A clear and concise explanation of the term or concept")

class Flashcards(BaseModel):
    """A list of flashcards defining key terms or concepts."""
    cards: List[Card] = Field(description="A list of flashcards")

    @field_validator('cards', mode='before')
    @classmethod
    def unwrap_cards(cls, v):
        if v and isinstance(v, list) and isinstance(v[0], dict) and "Card" in v[0]:
            return [item["Card"] for item in v]
        return v

class TrueFalseQuestion(BaseModel):
    """A true/false question."""
    question: str = Field(description="The question text")
    correct_answer: bool = Field(description="The correct answer (True or False)")
    explanation: str = Field(description="Explanation of why the answer is correct")

class MultipleChoiceQuestion(BaseModel):
    """A multiple choice question with 4 options."""
    question: str = Field(description="The question text")
    options: List[str] = Field(description="List of 4 answer options")
    correct_answer: int = Field(description="Index of the correct answer (0-3)")
    explanation: str = Field(description="Explanation of why the answer is correct")

class Quiz(BaseModel):
    """A quiz containing true/false and multiple choice questions."""
    true_false_questions: List[TrueFalseQuestion] = Field(description="List of 2 true/false questions")
    multiple_choice_questions: List[MultipleChoiceQuestion] = Field(description="List of 3 multiple choice questions")


# --- DSPy Signatures for Content Generation ---

class GenerateRelatedQuestions(dspy.Signature):
    """Generate related questions for a given topic."""
    topic: str = dspy.InputField()
    questions: RelatedQuestionsSet = dspy.OutputField(desc="A list of 5 related questions")

class GenerateLessons(dspy.Signature):
    """Generate lessons for a given topic."""
    topic: str = dspy.InputField()
    lessons: List[Lesson] = dspy.OutputField(desc="A list of 5 lessons with concise content")

class GenerateFlashcards(dspy.Signature):
    """Generate flashcards for a given topic or lesson dictionary."""
    topic: Union[str, dict] = dspy.InputField()
    flashcards: Flashcards = dspy.OutputField(desc="A list of 5 flashcards")

class GenerateQuiz(dspy.Signature):
    """Generate a quiz based on flashcards."""
    flashcards: Union[Flashcards, dict] = dspy.InputField()
    quiz: Quiz = dspy.OutputField(desc="A quiz with 2 true/false questions and 3 multiple choice questions")


# --- DSPy Modules (Predictors) ---

generate_related_questions_module = dspy.Predict(GenerateRelatedQuestions)
generate_lessons_module = dspy.Predict(GenerateLessons)
generate_flashcards_module = dspy.Predict(GenerateFlashcards)
generate_quiz_module = dspy.Predict(GenerateQuiz)