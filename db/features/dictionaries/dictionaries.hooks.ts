import { useCallback, useEffect, useState } from "react";
import { hasDictionaryQuery } from "./dictionaries.queries";

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
