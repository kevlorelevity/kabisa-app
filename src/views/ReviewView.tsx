import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useModules } from '../hooks/useModules';
import { useSRS } from '../hooks/useSRS';
import { Flashcard } from '../components/Flashcard';
import type { VocabEntry, Rating } from '../types';

interface DueCard {
  key: string;
  entry: VocabEntry;
}

export function ReviewView() {
  const modules = useModules();
  const { dueKeys, schedule } = useSRS();
  const [sessionKeys, setSessionKeys] = useState<string[]>(() => [...dueKeys]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);

  // Resolve card keys to vocab entries
  function resolveCard(key: string): DueCard | null {
    const [moduleId, indexStr] = key.split(':');
    const mod = modules.find((m) => m.id === moduleId);
    const entry = mod?.vocabulary[parseInt(indexStr)];
    if (!entry) return null;
    return { key, entry };
  }

  function handleRate(rating: Rating) {
    const key = sessionKeys[currentIndex];
    schedule(key, rating);
    const next = currentIndex + 1;
    if (next >= sessionKeys.length) {
      setSessionDone(true);
    } else {
      setCurrentIndex(next);
    }
  }

  if (sessionKeys.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-gray-700 font-medium">No cards due for review.</p>
        <p className="text-gray-400 text-sm mt-1">
          Complete a module and add its vocabulary to the review queue.
        </p>
        <Link to="/" className="text-green-700 text-sm mt-4 inline-block">
          ← Browse modules
        </Link>
      </div>
    );
  }

  if (sessionDone) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-2xl font-bold text-gray-900">Session complete</p>
        <p className="text-gray-500 text-sm mt-2">
          {sessionKeys.length} card{sessionKeys.length !== 1 ? 's' : ''} reviewed.
        </p>
        <Link to="/" className="mt-6 inline-block px-5 py-2 bg-green-700 text-white rounded-lg text-sm hover:bg-green-800">
          Back to catalog
        </Link>
      </div>
    );
  }

  const current = resolveCard(sessionKeys[currentIndex]);

  if (!current) {
    // Skip orphaned card (module deleted)
    handleRate('forgot');
    return null;
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <p className="text-xs text-gray-400">
          {currentIndex + 1} / {sessionKeys.length}
        </p>
        <Link to="/" className="text-xs text-gray-400 hover:text-gray-600">
          Exit
        </Link>
      </div>
      <Flashcard entry={current.entry} onRate={handleRate} />
    </div>
  );
}
