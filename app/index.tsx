import { EntryModalProvider } from "@/features/video-player/contexts/entry-modal-context";
import { VideoScreenProvider } from "@/features/video-player/contexts/video-screen-context";
import { VideoPlayerScreen } from "@/features/video-player/video-player-screen";
import { StatusBar } from "expo-status-bar";

export default function Index() {
  return (
    <EntryModalProvider>
      <VideoScreenProvider>
        <VideoPlayerScreen />
        <StatusBar style="auto" />
      </VideoScreenProvider>
    </EntryModalProvider>
  );
}
