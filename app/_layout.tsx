import '@/global.css';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppThemeProvider } from 'theme/theme-provider';
import AppTabs from '@/components/app-tabs';
import { DictionaryProvider } from '@/contexts/sqlite';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DictionaryProvider>
        <AppThemeProvider>
          <SafeAreaProvider>
            <SafeAreaView className="flex-1" edges={["top", "left", "right", "bottom"]}>
              <AppTabs />
            </SafeAreaView>
          </SafeAreaProvider>
        </AppThemeProvider>
      </DictionaryProvider>
    </GestureHandlerRootView>
  );
}
