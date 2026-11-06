import { Alert } from 'react-native';
import { getDictionaryDirectory } from '@/lib/file-system';
import { useRef, useState } from 'react';
import { useAppTheme } from '@/theme/theme-provider';
import { Stack } from 'expo-router';
import { DictionaryImportOverlay } from './dictionary-import-overlay';
import { importDictionary } from '@/lib/dictionaries/import-dictionary';
import { useMutation } from '@/db/hooks/use-mutation';
import { NOPMutationMapper } from '@/db/hooks/use-app-live-query';

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
      const directory = await getDictionaryDirectory();
      if (!directory.exists) throw new Error('Dictionary not detected');
      await mutate(directory.uri);
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
