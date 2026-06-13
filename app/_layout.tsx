import '@/global.css';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppThemeProvider } from 'theme/theme-provider';
import AppTabs from '@/components/app-tabs';
import { DictionaryProvider } from '@/contexts/dictionary-sqlite';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { FileProvider } from '@/contexts/file-sqlite';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DictionaryProvider>
        <FileProvider>
          <AppThemeProvider>
            <SafeAreaProvider>
              <AppTabs />
            </SafeAreaProvider>
          </AppThemeProvider>
        </FileProvider>
      </DictionaryProvider>
    </GestureHandlerRootView >
  );
}
