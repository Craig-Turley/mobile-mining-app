import { VideoScreenProvider } from '@/features/video-player/contexts/video-screen-context';
import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <VideoScreenProvider>
      <Stack />
    </VideoScreenProvider>
  );
}
