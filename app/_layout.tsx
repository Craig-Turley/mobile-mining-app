import '@/global.css';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppThemeProvider } from 'theme/theme-provider';
import AppTabs from '@/components/app-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppThemeProvider>
        <SafeAreaProvider>
          <AppTabs />
        </SafeAreaProvider>
      </AppThemeProvider>
    </GestureHandlerRootView >
  );
}
