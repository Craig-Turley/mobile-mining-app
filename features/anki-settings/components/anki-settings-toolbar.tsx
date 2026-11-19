import { useAppTheme } from '@/theme/theme-provider';
import { Stack } from 'expo-router';

export function AnkiSettingsToolbar() {
  const { colors } = useAppTheme();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Configurations',
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
