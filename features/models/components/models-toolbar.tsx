import { useAppTheme } from '@/theme/theme-provider';
import { router, Stack } from 'expo-router';

export function ModelsToolbar() {
  const { colors } = useAppTheme();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Models',
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

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="plus"
          onPress={() => {
            router.push({
              pathname: '/model-create',
            });
          }}></Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}
