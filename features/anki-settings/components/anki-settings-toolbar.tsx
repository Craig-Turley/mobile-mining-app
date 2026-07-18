import { useAppTheme } from '@/theme/theme-provider';
import { router, Stack } from 'expo-router';

export function AnkiSettingsToolbar() {
  const { colors } = useAppTheme();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Anki Settings',
          headerLargeTitle: false,
          headerTitleStyle: {
            color: colors.foreground,
          },
          headerTransparent: false,
          headerStyle: {
            backgroundColor: colors.background,
          },
        }}
      />
    </>
  );
}
