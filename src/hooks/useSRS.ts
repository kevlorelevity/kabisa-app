import { useContext } from 'react';
import { SRSContext, type SRSContextValue } from './srsContext';

export function useSRS(): SRSContextValue {
  const ctx = useContext(SRSContext);
  if (!ctx) throw new Error('useSRS must be used within an SRSProvider');
  return ctx;
}
