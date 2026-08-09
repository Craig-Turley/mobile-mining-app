import { ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { dictionariesDb } from '@/db/dictionaries/client';

import { appDb } from '@/db/app/client';
import appMigrations from '@/drizzle/app/migrations';
import dictionariesMigration from '@/drizzle/dictionaries/migrations';
import { SafeAreaView } from 'react-native-safe-area-context';
import { attachAndBuildViews, InstalledDictionary } from '@/db/features/dictionaries/dictionaries.actions';
import { DefaultSQLiteDownloadDirectory, getDatabasePath, getFileName, listDirectoryContents } from '@/lib/file-system';

type Props = {
  children: ReactNode;
};

export function DatabaseProvider({ children }: Props) {
  const appMigration = useMigrations(appDb, appMigrations);
  const dictionaryMigration = useMigrations(dictionariesDb, dictionariesMigration);

  const migrationError = appMigration.error ?? dictionaryMigration.error;
  if (migrationError) {
    return (
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']}>
        <Text>Database setup failed.</Text>
        <Text>{migrationError instanceof Error ? migrationError.message : String(migrationError)}</Text>
      </SafeAreaView>
    );
  }

  const migrationsReady = appMigration.success && dictionaryMigration.success;
  if (!migrationsReady) {
    return (
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']}>
        <View>
          <ActivityIndicator />
          <Text>Preparing databases...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <DictionaryAttachProvider>
      {children}
    </DictionaryAttachProvider>
  );
}

function DictionaryAttachProvider({ children }: Props) {
  const [status, setStatus] = useState<'attaching' | 'ready' | 'error'>('attaching');
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const installed =
          listDirectoryContents(DefaultSQLiteDownloadDirectory.uri)
            .map(dir => ({ filePath: getDatabasePath(dir), alias: getFileName(dir) }))
        await attachAndBuildViews(installed);
        if (!cancelled) setStatus('ready');
      } catch (e) {
        if (!cancelled) {
          setError(e);
          setStatus('error');
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (status === 'error') {
    return (
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']}>
        <Text>Database setup failed.</Text>
        <Text>{error instanceof Error ? error.message : String(error)}</Text>
      </SafeAreaView>
    );
  }
  if (status === 'attaching') {
    return (
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']}>
        <View>
          <ActivityIndicator />
          <Text>Loading dictionaries...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return <>{children}</>;
}
