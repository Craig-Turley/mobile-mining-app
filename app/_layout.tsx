import '@/global.css';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppThemeProvider, useAppTheme } from '@/theme/theme-provider';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DatabaseProvider } from '@/contexts/database-provider';
import { Stack } from 'expo-router';
import { useMemo } from 'react';

export default function App() {
  return (
    <AppThemeProvider>
      <AppContent />
    </AppThemeProvider>
  );
}

function AppContent() {
  const { colors } = useAppTheme();
  const screenOptions = useMemo(
    () => ({
      contentStyle: { backgroundColor: colors.background },
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.foreground,
    }),
    [colors]
  );

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <DatabaseProvider>
          <Stack screenOptions={screenOptions}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </DatabaseProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
