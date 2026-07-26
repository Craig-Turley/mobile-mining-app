import { QueueScreen } from '@/features/queue/queue-screen';
import { StatusBar } from 'expo-status-bar';

export default function Index() {
  return (
    <>
      <QueueScreen />
      <StatusBar style="auto" />
    </>
  );
}
