import '@/global.css';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppThemeProvider } from 'theme/theme-provider';
import AppTabs from '@/components/app-tabs';

export default function App() {
  return (
    <AppThemeProvider>
      <SafeAreaProvider>
        <SafeAreaView className="flex-1" edges={["top", "left", "right", "bottom"]}>
          <AppTabs />
        </SafeAreaView>
      </SafeAreaProvider>
    </AppThemeProvider>
  );
}
