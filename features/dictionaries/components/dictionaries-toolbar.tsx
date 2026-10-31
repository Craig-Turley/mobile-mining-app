import { Alert } from 'react-native';
import { getDictionaryDirectory, getDictionaryZipFile } from '@/lib/file-system';
import { useRef, useState } from 'react';
import { useAppTheme } from '@/theme/theme-provider';
import { Stack } from 'expo-router';
import { DictionaryImportOverlay } from './dictionary-import-overlay';
import { useConvertDictionary } from '@/db/features/dictionaries/dictionaries.hooks';

export function DictionariesToolbar() {
  const { colors } = useAppTheme();
  const { convertDictionary, isLoading, isError, error } = useConvertDictionary();
  const [isPicking, setIsPicking] = useState(false);
  const picking = useRef(false);
  if (isError) {
    console.error(error);
  }

  const uploadHelper = async (format: 'directory' | 'zip') => {
    if (picking.current || isLoading) return;
    picking.current = true;
    setIsPicking(true);
    try {
      if (format === 'zip') {
        const file = await getDictionaryZipFile();
        if (file == null) return;
        await convertDictionary(file.uri, 'zip');
      } else {
        const directory = await getDictionaryDirectory();
        if (!directory.exists) throw new Error('Dictionary not detected');
        await convertDictionary(directory.uri);
      }
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

  const chooseImport = () => {
    if (picking.current || isLoading) return;
    Alert.alert('Import dictionary', 'Choose a transformed dictionary ZIP or folder.', [
      { text: 'Import ZIP', onPress: () => uploadHelper('zip') },
      { text: 'Import folder', onPress: () => uploadHelper('directory') },
      { text: 'Cancel', style: 'cancel' },
    ]);
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
          disabled={isLoading || isPicking}
          onPress={chooseImport}
        />
      </Stack.Toolbar>

      <DictionaryImportOverlay visible={isLoading} label="Importing dictionary…" />
    </>
  );
}
