import { useAppTheme } from "@/theme/theme-provider";
import { Stack } from "expo-router";

export function DictionariesToolbar() {
  const { colors } = useAppTheme();

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
    </>
  );
}
