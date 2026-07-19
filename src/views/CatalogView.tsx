import { useState } from 'react';
import { useModules } from '../hooks/useModules';
import { ModuleCard } from '../components/ModuleCard';
import { getModuleProgress } from '../storage';
import type { Category, Difficulty, ModuleStatus } from '../types';

const CATEGORIES: Array<{ value: Category | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'transport', label: 'Transport' },
  { value: 'food-drink', label: 'Food & Drink' },
  { value: 'commerce', label: 'Commerce' },
  { value: 'health', label: 'Health' },
  { value: 'work-admin', label: 'Work & Admin' },
  { value: 'social', label: 'Social' },
];

const DIFFICULTIES: Array<{ value: Difficulty | 'all'; label: string }> = [
  { value: 'all', label: 'All levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'medium', label: 'Medium' },
  { value: 'advanced', label: 'Advanced' },
];

export function CatalogView() {
  const modules = useModules();
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all');

  const filtered = modules.filter(
    (m) =>
      (category === 'all' || m.category === category) &&
      (difficulty === 'all' || m.difficulty === difficulty)
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <p className="text-gray-500 text-sm mb-6">
        Learn Swahili as it's actually spoken in Kenya.
      </p>

      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category | 'all')}
          className="text-sm border border-gray-200 rounded px-2 py-1 bg-white"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty | 'all')}
          className="text-sm border border-gray-200 rounded px-2 py-1 bg-white"
        >
          {DIFFICULTIES.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-400 text-sm">No modules match these filters.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map((m) => {
            const progress = getModuleProgress(m.id);
            const status: ModuleStatus = progress?.status ?? 'not-started';
            return <ModuleCard key={m.id} module={m} status={status} />;
          })}
        </div>
      )}
    </div>
  );
}
