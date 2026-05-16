import { useEventListener } from 'expo';
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

  timeStamp: number;
  setTimeStamp: (t: number) => void;
};

const VideoScreenContext = createContext<VideoScreenContextType | null>(null);

type VideoScreenProviderProps = {
  children: ReactNode;
};

export function VideoScreenProvider({ children }: VideoScreenProviderProps) {
  const player = useVideoPlayer(null, player => {
    player.timeUpdateEventInterval = 0.25
    player.play();
  });

  const [videoUri, setVideoUriState] = useState<string | null>(null);
  const [subtitlesUri, setSubtitlesUriState] = useState<string | null>(null);
  const [timeStamp, setTimeStampState] = useState(0);
  const playerLoaded = Boolean(videoUri);
  const subtitlesLoaded = Boolean(subtitlesUri);

  const setVideoUri = (uri: string) => {
    setVideoUriState(uri);
    player.replace(uri);
  };

  const setSubtitlesUri = (uri: string | null) => {
    setSubtitlesUriState(uri);
  };

  const setTimeStamp = useCallback((seconds: number) => {
    player.currentTime = seconds;
    setTimeStampState(seconds);
  }, [player]);

  const clearVideo = () => {
    player.replace(null);
  }

  const clearSubtitles = () => {
    setSubtitlesUriState(null);
  }

  const reset = () => {
    clearVideo();
    clearSubtitles();
  }

  useEventListener(player, 'timeUpdate', event => {
    setTimeStampState(event.currentTime);
  });

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

    timeStamp,
    setTimeStamp,
  }), [playerLoaded, videoUri, subtitlesLoaded, subtitlesUri, timeStamp],
  );

  return (
    <VideoScreenContext.Provider value={value}>
      {children}
    </VideoScreenContext.Provider>
  );

};

export function useVideoPlayerContext() {
  const context = useContext(VideoScreenContext);

  if (!context) {
    throw new Error(
      "useVideoScreenContext must be used inside a VideoScreenProvider"
    );
  }

  return context;
}
