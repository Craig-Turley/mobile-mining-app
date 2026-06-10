import { useLookupDb } from "@/contexts/dictionary-sqlite";
import { Entry } from "@/lib/entry";
import { Token } from "@kuzulabz/expo-kagome";
import { useEffect, useState } from "react";

export function useLookup(token: Token) {
  const lookup = useLookupDb();

  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    setLoading(true);

    if (!token) {
      setEntries(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        setError(null);

        const result = await lookup(token);

        if (!cancelled) {
          setEntries(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setEntries(null);
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
  }, [lookup, token]);

  const isError = error != null;

  return {
    entries,
    isLoading,
    error,
    isError
  };
}
