import { useCallback, useEffect, useState } from 'react';
import { hasDictionaryQuery } from './dictionaries.queries';
import { convert } from '@/db/lib';

export function useConvertDictionary() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const convertDictionary = useCallback(async (uri: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await convert(uri);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));

      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    convertDictionary,
    isLoading,
    isError: error !== null,
    error,
  };
}

export async function getHasDictionary() {
  const rows = await hasDictionaryQuery();
  return rows.length > 0;
}

export function useHasDictionary() {
  const [data, setData] = useState<boolean>();
  const [error, setError] = useState<unknown>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setData(await getHasDictionary());
    } catch (error) {
      setError(error);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    data,
    isLoading: data === undefined && error == null,
    isError: error != null,
    error,
    refresh,
  };
}
