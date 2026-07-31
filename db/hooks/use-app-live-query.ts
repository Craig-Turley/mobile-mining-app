import { useLiveQuery as useDrizzleLiveQuery } from 'drizzle-orm/expo-sqlite';

type DrizzleLiveQuery = Parameters<typeof useDrizzleLiveQuery>[0];

export const NOPMutationMapper = <T>(value: T): T => value;

export function useAppLiveQuery<TQuery extends DrizzleLiveQuery, TData>(
  query: TQuery,
  mapResult: (data: Awaited<TQuery>) => TData
) {
  const result = useDrizzleLiveQuery(query);

  return {
    ...result,
    data: mapResult(result.data),
    isLoading: result.updatedAt === undefined && result.error == null,
    isError: result.error != null,
  };
}
