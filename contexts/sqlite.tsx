import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ActivityIndicator, Text, View } from "react-native";
import type { SQLiteDatabase } from "expo-sqlite";

import { ensureLookupDbInstalled, openLookupDb } from "@/lib/sqlite";
import { Entry, JITENDEX_GET_QUERY } from "@/lib/entry";
import { Token } from "@kuzulabz/expo-kagome";

type LookupDbContextValue = {
  lookup: (token: Token) => Promise<Entry[]>;
};

const LookupDbContext = createContext<LookupDbContextValue | null>(null);

type LookupDbProviderProps = {
  children: ReactNode;
};

export function DictionaryProvider({ children }: LookupDbProviderProps) {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        await ensureLookupDbInstalled((p) => {
          if (!cancelled) {
            setProgress(p);
          }
        });

        const lookupDb = await openLookupDb();

        if (!cancelled) {
          setDb(lookupDb);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
        }
      }
    }

    setup();

    return () => {
      cancelled = true;
    };
  }, []);

  const lookup = useCallback(
    async (token: Token): Promise<Entry[]> => {
      if (!db) {
        throw new Error("Lookup database is not ready");
      }

      return db.getAllAsync<Entry>(
        JITENDEX_GET_QUERY,
        token.base_form,
        token.reading
      );
    },
    [db]
  );

  const value = useMemo<LookupDbContextValue | null>(() => {
    if (!db) return null;

    return { lookup };
  }, [db, lookup]);

  if (error) {
    return (
      <View style={{ padding: 16 }}>
        <Text>Failed to load dictionary database.</Text>
        <Text>{String(error)}</Text>
      </View>
    );
  }

  if (!value) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <ActivityIndicator />
        <Text>
          {progress == null
            ? "Preparing dictionary..."
            : `Downloading dictionary: ${Math.round(progress * 100)}%`}
        </Text>
      </View>
    );
  }

  return (
    <LookupDbContext.Provider value={value}>
      {children}
    </LookupDbContext.Provider>
  );
}

export function useLookupDb() {
  const context = useContext(LookupDbContext);

  if (!context) {
    throw new Error("useLookupDb must be used inside LookupDbProvider");
  }

  return context.lookup;
}
