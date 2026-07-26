import { useAppTheme } from '@/theme/theme-provider';
import { Stack } from 'expo-router';
import { useNewDeckModal } from '../contexts/new-deck-modal-context';

export function DecksToolbar() {
  const { colors } = useAppTheme();
  const { open } = useNewDeckModal();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Decks',
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
          onPress={() => { open() }}>
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}
