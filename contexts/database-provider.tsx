import { ReactNode } from 'react';
import { Text } from 'react-native';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

import { filesDb } from '@/db/files/client';
import filesMigrations from '../drizzle/files/migrations';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  children: ReactNode;
};

export function DatabaseProvider({ children }: Props) {
  const filesMigrationState = useMigrations(filesDb, filesMigrations);
  console.log("ran migrations");

  if (filesMigrationState.error) {
    return (
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']}>
        <Text className='text-foreground'>Database setup failed.</Text>
        <Text className='text-foreground'>{filesMigrationState.error?.message}</Text>
      </SafeAreaView>
    );
  }

  if (!filesMigrationState.success) {
    return (
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']}>
        <Text className='text-foreground'>Preparing databases...</Text>
      </SafeAreaView>
    );
  }

  return <>{children}</>;
}
