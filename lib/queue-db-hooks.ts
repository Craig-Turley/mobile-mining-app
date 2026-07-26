import { useMemo } from 'react';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import {
  allQueueItemsQuery,
} from '@/db/repositories/queue.repository';

export function useQueue() {
  const query = useMemo(
    () => allQueueItemsQuery(),
    [],
  );

  const result = useLiveQuery(query);

  return {
    ...result,
    queuedItems: result.data ?? [],
    isLoading:
      result.updatedAt === undefined &&
      !result.error,
  };
}
