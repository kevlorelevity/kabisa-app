import { useParams, Link } from 'react-router-dom';
import { useLesson } from '../hooks/useLessons';
import { PracticeSession } from '../components/PracticeSession';

export function PracticeView() {
  const { id } = useParams<{ id: string }>();
  const lesson = useLesson(id ?? '');

  if (!lesson || !lesson.practice?.length) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">No practice session for this lesson yet.</p>
        <Link to="/lessons" className="text-green-700 text-sm mt-2 inline-block">
          ← Back to lessons
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 pb-16">
      <div>
        <Link to={`/lesson/${lesson.id}`} className="text-sm text-gray-400 hover:text-gray-600">
          ← {lesson.title}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Practice session</h1>
        <p className="text-sm text-gray-500 mt-1">
          Short lines from the ride. Pick the word that fills the gap — tap a chip to answer.
        </p>
      </div>
      <PracticeSession items={lesson.practice} />
    </div>
  );
}
