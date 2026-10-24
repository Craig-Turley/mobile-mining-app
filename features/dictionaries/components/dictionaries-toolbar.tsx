import { Alert } from 'react-native';
import { getDictionaryDirectory } from '@/lib/file-system';
import { useAppTheme } from '@/theme/theme-provider';
import { Stack } from 'expo-router';
import { DictionaryImportOverlay } from './dictionary-import-overlay';
import { useConvertDictionary } from '@/db/features/dictionaries/dictionaries.hooks';

export function DictionariesToolbar() {
  const { colors } = useAppTheme();
  const { convertDictionary, isLoading, isError, error } = useConvertDictionary();
  if (isError) {
    console.error(error);
  }

  const uploadHelper = async () => {
    try {
      const directory = await getDictionaryDirectory();
      console.log(directory.uri);
      if (!directory.exists) { throw new Error("Dictionary not detected") };
      await convertDictionary(directory.uri);
    } catch (e) {
      console.error('Dictionary import failed:', e);

      Alert.alert(
        'Dictionary Import Failed',
        'There was an error importing your dictionary. Please try again.',
      );
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
          disabled={isLoading}
          onPress={uploadHelper}
        />
      </Stack.Toolbar>

      <DictionaryImportOverlay
        visible={isLoading}
        label="Importing dictionary…"
      />
    </>
  );
}
