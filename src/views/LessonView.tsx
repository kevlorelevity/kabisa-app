import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLesson } from '../hooks/useLessons';
import { DialoguePlayer } from '../components/DialoguePlayer';
import { VocabEntry } from '../components/VocabEntry';
import { setLessonComplete } from '../storage';

const DIFFICULTY_LABELS = {
  beginner: 'Beginner',
  medium: 'Medium',
  advanced: 'Advanced',
};

export function LessonView() {
  const { id } = useParams<{ id: string }>();
  const lesson = useLesson(id ?? '');
  // Only reflects THIS playthrough — isLessonComplete() (persisted) still
  // drives the "Complete" badge back on the lessons catalog, but showing it
  // here before the learner has replayed the conversation reads as a lie.
  const [complete, setComplete] = useState(false);

  if (!lesson) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Lesson not found.</p>
        <Link to="/lessons" className="text-green-700 text-sm mt-2 inline-block">
          ← Back to lessons
        </Link>
      </div>
    );
  }

  function handleComplete() {
    setLessonComplete(lesson!.id);
    setComplete(true);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <Link to="/lessons" className="text-sm text-gray-400 hover:text-gray-600">
          ← Lessons
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{lesson.title}</h1>
        <span className="text-xs text-gray-500 capitalize">
          {DIFFICULTY_LABELS[lesson.difficulty]}
        </span>
      </div>

      <section>
        <h2 className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">
          Context
        </h2>
        <p className="text-gray-700 leading-relaxed">{lesson.culturalNote}</p>
        <p className="text-gray-500 text-sm italic mt-2">{lesson.startingPoint}</p>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-4">
          Conversation
        </h2>
        <div className="bg-gray-50 rounded-lg p-4">
          <DialoguePlayer turns={lesson.turns} onComplete={handleComplete} />
        </div>
      </section>

      {complete && (
        <section className="pb-16 space-y-4">
          <p className="text-sm text-gray-500">✓ Lesson complete.</p>
          <div>
            <h2 className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">
              Key vocabulary ({lesson.vocabulary.length} terms)
            </h2>
            <div className="divide-y divide-gray-100">
              {lesson.vocabulary.map((entry) => (
                <VocabEntry key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
