import { VideoScreenProvider } from "@/features/video-player/contexts/video-screen-context";
import { VideoPlayerScreen } from "@/features/video-player/video-player-screen";
import { StatusBar } from "expo-status-bar";

export default function Index() {
  return (
    <VideoScreenProvider>
      <VideoPlayerScreen />
      <StatusBar style="auto" />
    </VideoScreenProvider>
  );
}
