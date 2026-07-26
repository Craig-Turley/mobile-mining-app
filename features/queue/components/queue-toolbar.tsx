import { useAppTheme } from '@/theme/theme-provider';
import { Stack } from 'expo-router';

export function QueueToolbar() {
  const { colors } = useAppTheme();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Queue Settings',
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
