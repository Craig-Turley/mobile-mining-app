import { useVideoPlayer, VideoPlayer } from "expo-video";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type VideoScreenContextType = {
  player: VideoPlayer;
  playerLoaded: boolean;
  setVideoUri: (uri: string) => void;

  subtitlesLoaded: boolean;
  subtitlesUri: string | null;
  setSubtitlesUri: (uri: string) => void;

  clearVideo: () => void;
  clearSubtitles: () => void;
  reset: () => void;

  setTimeStamp: (t: number) => void;
};

const VideoScreenContext = createContext<VideoScreenContextType | null>(null);

type VideoScreenProviderProps = {
  children: ReactNode;
};

export function VideoScreenProvider({ children }: VideoScreenProviderProps) {
  const player = useVideoPlayer(null, player => {
    player.timeUpdateEventInterval = 0.25;
    player.play();
  });

  const [videoUri, setVideoUriState] = useState<string | null>(null);
  const [subtitlesUri, setSubtitlesUriState] = useState<string | null>(null);

  const playerLoaded = Boolean(videoUri);
  const subtitlesLoaded = Boolean(subtitlesUri);

  const setVideoUri = useCallback((uri: string) => {
    setVideoUriState(uri);
    player.replace(uri);
  }, [player]);

  const setSubtitlesUri = useCallback((uri: string | null) => {
    setSubtitlesUriState(uri);
  }, []);

  const clearVideo = useCallback(() => {
    player.replace(null);
    setVideoUriState(null);
  }, [player]);

  const clearSubtitles = useCallback(() => {
    setSubtitlesUriState(null);
  }, []);

  const reset = useCallback(() => {
    clearVideo();
    clearSubtitles();
  }, [clearVideo, clearSubtitles]);

  const setTimeStamp = useCallback((seconds: number) => {
    player.currentTime = seconds;
  }, [player]);

  const value = useMemo(() => ({
    player,
    playerLoaded,
    setVideoUri,

    subtitlesLoaded,
    subtitlesUri,
    setSubtitlesUri,

    clearVideo,
    clearSubtitles,
    reset,

    setTimeStamp,
  }), [
    player,
    playerLoaded,
    setVideoUri,

    subtitlesLoaded,
    subtitlesUri,
    setSubtitlesUri,

    clearVideo,
    clearSubtitles,
    reset,

    setTimeStamp,
  ]);

  return (
    <VideoScreenContext.Provider value={value}>
      {children}
    </VideoScreenContext.Provider>
  );
}

export function useVideoPlayerContext() {
  const context = useContext(VideoScreenContext);

  if (!context) {
    throw new Error(
      "useVideoScreenContext must be used inside a VideoScreenProvider"
    );
  }

  return context;
}
