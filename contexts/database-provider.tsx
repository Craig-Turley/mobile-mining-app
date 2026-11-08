import { ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { appDb } from '@/db/app/client';
import { dictionariesDb } from '@/db/dictionaries/client';
import appMigrations from '@/drizzle/app/migrations';
import dictionariesMigration from '@/drizzle/dictionaries/migrations';
import { SafeAreaView } from 'react-native-safe-area-context';
import { initializeCssCache } from '@/lib/dictionaries/cache';
import { getDictionariesQuery } from '@/db/features/dictionaries/dictionaries.queries';
import { attachAndBuildViews } from '@/db/features/dictionaries/dictionaries.actions';

type Props = {
  children: ReactNode;
};

export function DatabaseProvider({ children }: Props) {
  const appMigration = useMigrations(appDb, appMigrations);
  const dictionaryMigration = useMigrations(dictionariesDb, dictionariesMigration);

  const migrationError = appMigration.error ?? dictionaryMigration.error;
  if (migrationError) {
    return (
      <SafeAreaView
        edges={['top', 'bottom', 'left', 'right']}
        className="flex-1 items-center justify-center px-6"
      >
        <Text className="text-center text-foreground font-bold text-2xl">
          Database setup failed.
        </Text>
        {/*<Text className="text-center text-foreground">
          {migrationError instanceof Error
            ? migrationError.message
            : String(migrationError)}
        </Text>*/}
      </SafeAreaView>
    );
  }

  const migrationsReady = appMigration.success && dictionaryMigration.success;
  if (!migrationsReady) {
    return (
      <SafeAreaView
        edges={['top', 'bottom', 'left', 'right']}
        className="flex-1 items-center justify-center px-6"
      >
        <View className="items-center gap-3">
          <ActivityIndicator size="large" />
          <Text className="text-center font-bold text-2xl text-foreground">Preparing database...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return <DictionaryAttachProvider>{children}</DictionaryAttachProvider>;
}

function DictionaryAttachProvider({ children }: Props) {
  const [status, setStatus] = useState<'attaching' | 'ready' | 'error'>('attaching');
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await attachAndBuildViews();
        initializeCssCache(await getDictionariesQuery());
        if (!cancelled) setStatus('ready');
      } catch (e) {
        if (!cancelled) {
          setError(e);
          setStatus('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'error') {
    return (
      <SafeAreaView
        edges={['top', 'bottom', 'left', 'right']}
        className="flex-1 items-center justify-center px-6"
      >
        <View className="items-center gap-3">
          <Text className="text-center text-2xl font-bold text-foreground">
            Database setup failed.
          </Text>
          {/*<Text className="text-center text-mutedForeground">
            {error instanceof Error ? error.message : String(error)}
          </Text>*/}
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'attaching') {
    return (
      <SafeAreaView
        edges={['top', 'bottom', 'left', 'right']}
        className="flex-1 items-center justify-center px-6"
      >
        <View className="items-center gap-3">
          <ActivityIndicator size="large" />
          <Text className="text-center text-foreground text-2xl font-bold">
            Loading dictionaries...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return <>{children}</>;
}
