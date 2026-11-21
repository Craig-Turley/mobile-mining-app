import { Alert } from 'react-native';
import { getDictionaryFile } from '@/lib/file-system';
import { useRef, useState } from 'react';
import { useAppTheme } from '@/theme/theme-provider';
import { Stack } from 'expo-router';
import { DictionaryImportOverlay } from './dictionary-import-overlay';
import { importDictionary } from '@/lib/dictionaries/import-dictionary';
import { useMutation } from '@/db/hooks/use-mutation';
import { NOPMutationMapper } from '@/db/hooks/use-app-live-query';
import { attachAndBuildViews } from '@/db/features/dictionaries/dictionaries.actions';
import { initializeCssCache } from '@/lib/dictionaries/cache';
import { getDictionariesQuery } from '@/db/features/dictionaries/dictionaries.queries';

export function DictionariesToolbar() {
  const { colors } = useAppTheme();
  // WARN: this is a little bit of misuse of this hook :(
  const { mutate, isError, error, isPending } = useMutation(importDictionary, NOPMutationMapper);
  const [isPicking, setIsPicking] = useState(false);
  const picking = useRef(false);
  if (isError) {
    console.error(error);
  }

  const uploadHelper = async () => {
    if (picking.current || isPending) return;
    picking.current = true;
    setIsPicking(true);
    try {
      const file = await getDictionaryFile();
      if (!file) return;
      await mutate(file.uri);
      await attachAndBuildViews();
      initializeCssCache(await getDictionariesQuery());
    } catch (e) {
      if (
        typeof e === 'object' &&
        e !== null &&
        'code' in e &&
        e.code === 'ERR_FILE_PICKING_CANCELLED'
      )
        return;
      console.error('Dictionary import failed:', e);

      Alert.alert(
        'Dictionary Import Failed',
        e instanceof Error
          ? e.message
          : 'There was an error importing your dictionary. Please try again.'
      );
    } finally {
      picking.current = false;
      setIsPicking(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Dictionaries',
          headerLargeTitle: false,
          headerTitleStyle: {
            color: colors.foreground,
          },
          headerTransparent: false,
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerBackButtonDisplayMode: 'minimal',
        }}
      />

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="plus"
          disabled={isPending || isPicking}
          onPress={uploadHelper}
        />
      </Stack.Toolbar>

      <DictionaryImportOverlay visible={isPending} label="Importing dictionary…" />
    </>
  );
}
