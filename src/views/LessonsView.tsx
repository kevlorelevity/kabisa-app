import { useLessons } from '../hooks/useLessons';
import { LessonCard } from '../components/LessonCard';
import { isLessonPassed, isLessonUnlocked } from '../lib/lessonScores';

export function LessonsView() {
  const lessons = useLessons();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <p className="text-gray-500 text-sm mb-6">
        Play through real conversations, one line at a time — you're the customer. Each lesson unlocks the next
        once you've got it down.
      </p>

      {lessons.length === 0 ? (
        <p className="text-gray-400 text-sm">No lessons yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {lessons.map((l, i) => (
            <LessonCard
              key={l.id}
              lesson={l}
              passed={isLessonPassed(l)}
              locked={!isLessonUnlocked(lessons, l.id)}
              previousTitle={lessons[i - 1]?.title}
            />
          ))}
        </div>
      )}
    </div>
  );
}
