import { AnkiSettingsScreen } from '@/features/anki-settings/anki-settings-screen';
import { StatusBar } from 'expo-status-bar';

export default function Index() {
  return (
    <>
      <AnkiSettingsScreen />
      <StatusBar style="auto" />
    </>
  );
}
