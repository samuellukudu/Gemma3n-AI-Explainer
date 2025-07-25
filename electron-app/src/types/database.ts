export interface Topic {
  id: string;
  name: string;
}

export interface RelatedQuestion {
  id: number;
  topic_id: string;
  question: string;
  category: string;
  focus_area: string;
}

export interface Lesson {
  id: number;
  topic_id: string;
  title: string;
  overview: string;
  key_concepts: string[];
  examples: string[];
}

export interface Flashcard {
  id: number;
  lesson_id: number;
  term: string;
  explanation: string;
}

export interface Quiz {
  id: number;
  flashcard_set_id: number;
  type: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

export interface TopicDetails {
  topic: Topic;
  related_questions: RelatedQuestion[];
  lessons: Lesson[];
  flashcards: Flashcard[];
  quizzes: Quiz[];
}

export interface DatabaseStats {
  topics: number;
  related_questions: number;
  lessons: number;
  flashcards: number;
  quizzes: number;
}

export interface UserStats {
  totalTopicsExplored: number;
  totalStepsCompleted: number;
  totalQuizzesTaken: number;
  averageQuizScore: number;
  totalStudyTime: number;
  streak: number;
  lastStudyDate: string;
} 