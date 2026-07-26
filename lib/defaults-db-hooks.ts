import { useMemo } from 'react';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { getAppDefaultsQuery } from '@/db/repositories/defaults.repository';

export function useDefaults() {
  const query = useMemo(() => getAppDefaultsQuery(), []);

  const result = useLiveQuery(query);

  return {
    defaults: result.data?.[0] ?? null,
    error: result.error,
    updatedAt: result.updatedAt,
    isLoading: result.updatedAt === undefined && !result.error,
  };
}
