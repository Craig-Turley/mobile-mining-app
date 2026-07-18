import { ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

import { APP_DB_NAME, appDb } from '@/db/app/client';
import filesMigrations from '../drizzle/files/migrations';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ensureLookupDbInstalled } from '@/db/utils';

type Props = {
  children: ReactNode;
};

export function DatabaseProvider({ children }: Props) {
  const migrationState = useMigrations(appDb, filesMigrations);

  const [lookupReady, setLookupReady] = useState(false);
  const [lookupError, setLookupError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function installLookupDb() {
      try {
        await ensureLookupDbInstalled();

        if (!cancelled) {
          setLookupReady(true);
        }
      } catch (error) {
        if (!cancelled) {
          setLookupError(error instanceof Error ? error : new Error(String(error)));
        }
      }
    }

    void installLookupDb();
    // void clearDevDatabases();

    return () => {
      cancelled = true;
    };
  }, []);

  if (migrationState.error || lookupError) {
    const error = migrationState.error ?? lookupError;

    return (
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']}>
        <Text>Database setup failed.</Text>
        <Text>{error?.message ?? String(error)}</Text>
      </SafeAreaView>
    );
  }

  if (!migrationState.success || !lookupReady) {
    return (
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']}>
        <View>
          <ActivityIndicator />
          <Text>Preparing databases...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return <>{children}</>;
}

// WARN: the below is for developement
import * as SQLite from 'expo-sqlite';
import { JMDICT_DB_NAME } from '@/db/jmdict/client';

const DEV_DATABASES = [APP_DB_NAME] as const;

export async function clearDevDatabases(): Promise<void> {
  if (!__DEV__) {
    throw new Error('clearDevDatabases can only run in development.');
  }

  const results = await Promise.allSettled(
    DEV_DATABASES.map(async (databaseName) => {
      await SQLite.deleteDatabaseAsync(databaseName);
      console.log(`[database] Deleted ${databaseName}`);
    })
  );

  const failures = results
    .map((result, index) => ({
      result,
      databaseName: DEV_DATABASES[index],
    }))
    .filter(
      (
        entry
      ): entry is {
        result: PromiseRejectedResult;
        databaseName: (typeof DEV_DATABASES)[number];
      } => entry.result.status === 'rejected'
    );

  if (failures.length > 0) {
    failures.forEach(({ databaseName, result }) => {
      console.error(`[database] Failed to delete ${databaseName}`, result.reason);
    });

    throw new Error(
      `Failed to delete: ${failures.map((failure) => failure.databaseName).join(', ')}`
    );
  }
}
