import { useMemo } from 'react';
import type { Module } from '../types';

// Vite loads all module JSON files at build time
const moduleFiles = import.meta.glob('../../content/modules/*.json', {
  eager: true,
}) as Record<string, { default: Module }>;

export function useModules(): Module[] {
  return useMemo(
    () => Object.values(moduleFiles).map((f) => f.default),
    []
  );
}
