import { Link } from 'react-router-dom';
import type { Module, ModuleStatus } from '../types';

const CATEGORY_LABELS: Record<string, string> = {
  transport: 'Transport',
  'food-drink': 'Food & Drink',
  commerce: 'Commerce',
  health: 'Health',
  'work-admin': 'Work & Admin',
  social: 'Social',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<ModuleStatus, string> = {
  'not-started': '',
  'in-progress': 'In progress',
  reviewed: '✓ Reviewed',
};

interface ModuleCardProps {
  module: Module;
  status: ModuleStatus;
}

export function ModuleCard({ module, status }: ModuleCardProps) {
  return (
    <Link
      to={`/module/${module.id}`}
      className="block border border-gray-200 rounded-lg p-4 hover:border-green-400 hover:shadow-sm transition-all bg-white"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug">
          {module.title}
        </h3>
        {status !== 'not-started' && (
          <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
            {STATUS_LABELS[status]}
          </span>
        )}
      </div>
      <div className="flex gap-2 flex-wrap">
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
          {CATEGORY_LABELS[module.category] ?? module.category}
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full capitalize ${DIFFICULTY_COLORS[module.difficulty]}`}
        >
          {module.difficulty}
        </span>
      </div>
    </Link>
  );
}
