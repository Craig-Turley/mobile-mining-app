import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type VideoScreenContextType = {
  videoLoaded: boolean;
  videoUri: string | null;
  subtitlesLoaded: boolean;
  subtitlesUri: string | null;

  setVideoUri: (uri: string | null) => void;
  setSubtitlesUri: (uri: string | null) => void;
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
  const [videoUri, setVideoUriState] = useState<string | null>(null);
  const [subtitlesUri, setSubtitlesUriState] = useState<string | null>(null);
  const [timeStamp, setTimeStampState] = useState<number>(0);

  const videoLoaded = Boolean(videoUri);
  const subtitlesLoaded = Boolean(subtitlesUri);

  function setVideoUri(uri: string | null) {
    setVideoUriState(uri);
  }

  function setSubtitlesUri(uri: string | null) {
    setSubtitlesUriState(uri);
  }

  function clearVideo() {
    setVideoUriState(null);
  }

  function clearSubtitles() {
    setSubtitlesUriState(null);
  }

  function reset() {
    setVideoUriState(null);
    setSubtitlesUriState(null);
  }

  function setTimeStamp(t: number) {
    setTimeStampState(t);
  }

  const value = useMemo(
    () => ({
      videoLoaded,
      videoUri,
      subtitlesLoaded,
      subtitlesUri,
      setVideoUri,
      setSubtitlesUri,
      clearVideo,
      clearSubtitles,
      reset,
      timeStamp,
      setTimeStamp,
    }),
    [videoLoaded, videoUri, subtitlesLoaded, subtitlesUri, timeStamp]
  );

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
