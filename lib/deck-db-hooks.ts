import { useMemo } from 'react';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import {
  allDecksQuery,
} from '@/db/repositories/decks.repository';

export function useDecks() {
  const query = useMemo(
    () => allDecksQuery(),
    [],
  );

  const result = useLiveQuery(query);

  return {
    ...result,
    decks: result.data ?? [],
    isLoading:
      result.updatedAt === undefined &&
      !result.error,
  };
}
