import { EntryModalProvider } from "@/features/video-player/contexts/entry-modal-context";
import { VideoScreenProvider } from "@/features/video-player/contexts/video-screen-context";
import { VideoLibraryScreen } from "@/features/video-player/video-library-screen";
import { StatusBar } from "expo-status-bar";

export default function Index() {
  return (
    <EntryModalProvider>
      <VideoScreenProvider>
        <VideoLibraryScreen />
        <StatusBar style="auto" />
      </VideoScreenProvider>
    </EntryModalProvider>
  );
}
