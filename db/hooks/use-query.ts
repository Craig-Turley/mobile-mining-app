import { useEffect, useRef, useState } from 'react';

type UseQueryResult<TData> = {
  data: TData | null;
  isLoading: boolean;
  error: unknown;
  isError: boolean;
};

type UseQueryOptions = {
  enabled?: boolean;
};

export const NOPQueryMapper = <T>(value: T): T => value;

/**
 * Runs a database query and maps its raw result
 * into an application/domain type.
 */
export function useQuery<TDbData, TData>(
  queryFn: () => PromiseLike<TDbData>,
  mapResult: (data: TDbData) => TData,
  deps: React.DependencyList,
  options: UseQueryOptions = {}
): UseQueryResult<TData> {
  const { enabled = true } = options;

  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  const mapResultRef = useRef(mapResult);
  mapResultRef.current = mapResult;

  const [result, setResult] = useState<{
    deps: React.DependencyList;
    data: TData | null;
    error: unknown;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      return;
    }

    async function run() {
      try {
        const dbData = await queryFnRef.current();
        const mappedData = mapResultRef.current(dbData);

        if (!cancelled) {
          setResult({
            deps: [...deps],
            data: mappedData,
            error: null,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setResult({
            deps: [...deps],
            data: null,
            error,
          });
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };

  }, [enabled, ...deps]);

  const isCurrentResult =
    result !== null &&
    result.deps.length === deps.length &&
    result.deps.every((dep, index) => Object.is(dep, deps[index]));

  return {
    data: isCurrentResult ? result.data : null,
    isLoading: enabled && !isCurrentResult,
    error: isCurrentResult ? result.error : null,
    isError: isCurrentResult && result.error !== null,
  };
}
