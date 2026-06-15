import { addDatabaseChangeListener } from "expo-sqlite";
import { useEffect, useState } from "react";

type UseDbFuncResult<TData> = {
  data: TData | null;
  isLoading: boolean;
  error: unknown;
  isError: boolean;
};

type UseDbFuncOptions = {
  enabled?: boolean;
};

export function useDbFunc<TData>(
  fn: () => Promise<TData>,
  deps: React.DependencyList,
  options: UseDbFuncOptions = {}
): UseDbFuncResult<TData> {
  const { enabled = true } = options;

  const [data, setData] = useState<TData | null>(null);
  const [isLoading, setLoading] = useState(enabled);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    async function run() {
      try {
        setLoading(true);
        setError(null);

        const result = await fn();

        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [enabled, ...deps]);

  return {
    data,
    isLoading,
    error,
    isError: error != null,
  };
}
