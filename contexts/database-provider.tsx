import { ReactNode, useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

import { filesDb } from '@/db/files/client';
import filesMigrations from '../drizzle/files/migrations';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ensureLookupDbInstalled } from "@/lib/sqlite";

type Props = {
  children: ReactNode;
};

export function DatabaseProvider({ children }: Props) {
  // const filesMigrationState = useMigrations(filesDb, filesMigrations);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        await ensureLookupDbInstalled();
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

  if (error) {
    return (
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']}>
        <Text>Failed to load dictionary database.</Text>
        <Text>{String(error)}</Text>
      </SafeAreaView>
    );
  }

  // if (filesMigrationState.error) {
  //   return (
  //     <SafeAreaView edges={['top', 'bottom', 'left', 'right']}>
  //       <Text className='text-foreground'>Database setup failed.</Text>
  //       <Text className='text-foreground'>{filesMigrationState.error?.message}</Text>
  //     </SafeAreaView>
  //   );
  // }
  //
  // if (!filesMigrationState.success) {
  //   return (
  //     <SafeAreaView edges={['top', 'bottom', 'left', 'right']}>
  //       <Text className='text-foreground'>Preparing databases...</Text>
  //     </SafeAreaView>
  //   );
  // }

  return <>{children}</>;
}
