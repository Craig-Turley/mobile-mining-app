import { useCallback, useRef, useState } from 'react';

type UseMutationResult<TData, TVariables> = {
  data: TData | null;
  error: unknown;
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  mutate: (variables: TVariables) => Promise<TData>;
  reset: () => void;
};

export function useMutation<TMutationData, TData, TVariables>(
  mutationFn: (variables: TVariables) => PromiseLike<TMutationData>,
  mapResult: (data: TMutationData) => TData
): UseMutationResult<TData, TVariables> {
  const mutationFnRef = useRef(mutationFn);
  mutationFnRef.current = mutationFn;

  const mapResultRef = useRef(mapResult);
  mapResultRef.current = mapResult;

  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const mutate = useCallback(async (variables: TVariables): Promise<TData> => {
    setIsPending(true);
    setError(null);
    setIsSuccess(false);

    try {
      const mutationData = await mutationFnRef.current(variables);

      const mappedData = mapResultRef.current(mutationData);

      setData(mappedData);
      setIsSuccess(true);

      return mappedData;
    } catch (error) {
      setError(error);
      setData(null);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsPending(false);
    setIsSuccess(false);
  }, []);

  return {
    data,
    error,
    isPending,
    isError: error !== null,
    isSuccess,
    mutate,
    reset,
  };
}
