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

  const [data, setData] = useState<TData | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    async function run() {
      setIsLoading(true);
      setError(null);

      try {
        const dbData = await queryFnRef.current();
        const mappedData = mapResultRef.current(dbData);

        if (!cancelled) {
          setData(mappedData);
        }
      } catch (error) {
        if (!cancelled) {
          setError(error);
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [enabled, ...deps]);

  return {
    data,
    isLoading,
    error,
    isError: error !== null,
  };
}
