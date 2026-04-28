import '@/global.css';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppThemeProvider } from 'theme/theme-provider';
import { Stack } from 'expo-router';

export default function App() {
  return (
    <AppThemeProvider>
      <SafeAreaProvider>
        <Stack />
      </SafeAreaProvider>
    </AppThemeProvider>
  );
}
