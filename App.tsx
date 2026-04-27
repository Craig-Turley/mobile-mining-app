import { ScreenContent } from 'components/ScreenContent';
import { StatusBar } from 'expo-status-bar';

import './global.css';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppThemeProvider } from 'theme/theme-provider';

export default function App() {
  return (
    <AppThemeProvider>
      <SafeAreaProvider>
        <ScreenContent title="Home" path="App.tsx"></ScreenContent>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </AppThemeProvider>
  );
}
