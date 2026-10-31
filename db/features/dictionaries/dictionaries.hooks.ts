import { useCallback, useEffect, useRef, useState } from 'react';
import { hasDictionaryQuery } from './dictionaries.queries';
import { convert } from '@/db/lib';
import { importDictionaryZip } from '@/features/dictionaries/lib/import-dictionary-zip';

export function useConvertDictionary() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const importing = useRef(false);

  const convertDictionary = useCallback(
    async (uri: string, format: 'directory' | 'zip' = 'directory') => {
      if (importing.current) throw new Error('A dictionary import is already running.');
      importing.current = true;
      setIsLoading(true);
      setError(null);

      try {
        if (format === 'zip') await importDictionaryZip(uri);
        else await convert(uri);
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));

        setError(error);
        throw error;
      } finally {
        importing.current = false;
        setIsLoading(false);
      }
    },
    []
  );

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
