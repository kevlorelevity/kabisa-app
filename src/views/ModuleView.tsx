import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useModules } from '../hooks/useModules';
import { useProgress } from '../hooks/useProgress';
import { VocabEntry } from '../components/VocabEntry';
import { ExchangeLine } from '../components/ExchangeLine';
import { ExerciseFillBlank } from '../components/ExerciseFillBlank';
import { ExerciseMatch } from '../components/ExerciseMatch';
import { ExerciseTranslate } from '../components/ExerciseTranslate';
import { initialCardState } from '../srs';
import { setSRSCard } from '../storage';
import type { Exercise } from '../types';

const DIFFICULTY_LABELS = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export function ModuleView() {
  const { id } = useParams<{ id: string }>();
  const modules = useModules();
  const module = modules.find((m) => m.id === id);
  const { progress, updateProgress } = useProgress(id ?? '');
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set());

  if (!module) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Module not found.</p>
        <Link to="/" className="text-green-700 text-sm mt-2 inline-block">
          ← Back to catalog
        </Link>
      </div>
    );
  }

  function markExerciseComplete(index: number) {
    const next = new Set(completedExercises);
    next.add(index);
    setCompletedExercises(next);

    // Mark module as in-progress once first exercise is touched
    if (progress.status === 'not-started') {
      updateProgress({ status: 'in-progress' });
    }
  }

  function addToReview() {
    module!.vocabulary.forEach((_, i) => {
      const cardKey = `${module!.id}:${i}`;
      setSRSCard(cardKey, initialCardState());
    });
    updateProgress({
      status: 'reviewed',
      addedToReview: true,
      lastReviewed: new Date().toISOString().split('T')[0],
    });
  }

  const allExercisesDone = completedExercises.size >= module.exercises.length;

  function renderExercise(exercise: Exercise, index: number) {
    const onComplete = () => markExerciseComplete(index);
    switch (exercise.type) {
      case 'fill-blank':
        return <ExerciseFillBlank exercise={exercise} onComplete={onComplete} />;
      case 'match':
        return <ExerciseMatch exercise={exercise} onComplete={onComplete} />;
      case 'translate':
        return <ExerciseTranslate exercise={exercise} onComplete={onComplete} />;
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-10">
      <div>
        <Link to="/" className="text-sm text-gray-400 hover:text-gray-600">
          ← Catalog
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{module.title}</h1>
        <span className="text-xs text-gray-500 capitalize">
          {DIFFICULTY_LABELS[module.difficulty]}
        </span>
      </div>

      {/* Cultural note */}
      <section>
        <h2 className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">
          Context
        </h2>
        <p className="text-gray-700 leading-relaxed">{module.culturalNote}</p>
      </section>

      {/* Vocabulary */}
      <section>
        <h2 className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">
          Vocabulary ({module.vocabulary.length} terms)
        </h2>
        <div className="divide-y divide-gray-100">
          {module.vocabulary.map((entry, i) => (
            <VocabEntry key={i} entry={entry} />
          ))}
        </div>
      </section>

      {/* Exchange */}
      <section>
        <h2 className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">
          Example exchange
        </h2>
        <div className="bg-gray-50 rounded-lg p-4 divide-y divide-gray-100">
          {module.exchange.map((line, i) => (
            <ExchangeLine key={i} line={line} />
          ))}
        </div>
      </section>

      {/* Exercises */}
      <section>
        <h2 className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-4">
          Exercises
        </h2>
        <div className="space-y-8">
          {module.exercises.map((exercise, i) => (
            <div
              key={i}
              className={`p-4 rounded-lg border ${
                completedExercises.has(i)
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {renderExercise(exercise, i)}
            </div>
          ))}
        </div>
      </section>

      {/* Add to review */}
      <section className="pb-16">
        {progress.addedToReview ? (
          <p className="text-sm text-gray-500">
            ✓ Vocabulary added to review.{' '}
            <Link to="/review" className="text-green-700">
              Go to Review →
            </Link>
          </p>
        ) : (
          <button
            onClick={addToReview}
            disabled={!allExercisesDone}
            className="w-full py-3 bg-green-700 text-white font-medium rounded-lg hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {allExercisesDone
              ? 'Add vocabulary to review queue'
              : `Complete all exercises to unlock (${completedExercises.size}/${module.exercises.length} done)`}
          </button>
        )}
      </section>
    </div>
  );
}
