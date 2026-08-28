import { useLessons } from '../hooks/useLessons';
import { LessonCard } from '../components/LessonCard';
import { isLessonComplete } from '../storage';

export function LessonsView() {
  const lessons = useLessons();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <p className="text-gray-500 text-sm mb-6">
        Play through real conversations, one line at a time — you're the customer.
      </p>

      {lessons.length === 0 ? (
        <p className="text-gray-400 text-sm">No lessons yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {lessons.map((l) => (
            <LessonCard key={l.id} lesson={l} complete={isLessonComplete(l.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
