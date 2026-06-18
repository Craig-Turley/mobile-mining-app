import { VideoLibraryScreen } from "@/features/video-player/video-library-screen";
import { StatusBar } from "expo-status-bar";

export default function Index() {
  return (
    <>
      <VideoLibraryScreen />
      <StatusBar style="auto" />
    </>
  );
}
