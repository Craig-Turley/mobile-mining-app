import { useVideoPlayer, VideoPlayer } from 'expo-video';
import { createContext, RefObject, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { LocalMediaSource, MediaSource, YoutubeMediaSource } from '../lib/player-sources';
import { YoutubeIframeRef } from "react-native-youtube-iframe";

// NOTE: we are treating this as one context but this context actually
// switches the provider based on the tagged union below
// if you want to add another source for videos (right now is only local and youtube)
// then you'll need to implement the following
// 1. The context for the player
// 2. The video player itself
// 3. THe subtitle player
// you'll also notice below I included the players in the contexts themselves
// because it allows me to attach callbacks to the player methods themselves
// to avoid re-rendering a bunch (get's really slow)

type LocalPlayerContext = {
  source: LocalMediaSource;
  type: "local";
  player: VideoPlayer;

  getTimestamp: () => Promise<number>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
};

type YoutubePlayerContext = {
  source: YoutubeMediaSource;
  type: "youtube";

  player: RefObject<YoutubeIframeRef | null>;
  playing: boolean;
  onChangeState: (state: string) => void;

  getTimestamp: () => Promise<number>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
};

type VideoScreenContextType =
  | LocalPlayerContext
  | YoutubePlayerContext;

const VideoScreenContext = createContext<VideoScreenContextType | null>(null);

type VideoScreenProviderProps = {
  children: ReactNode;
  source: MediaSource;
};

export function VideoScreenProvider({ children, source }: VideoScreenProviderProps) {
  switch (source.type) {
    case "local":
      return (
        <LocalMediaPlayerProvider source={source}>
          {children}
        </LocalMediaPlayerProvider>
      );

    case "youtube":
      return (
        <YoutubeMediaPlayerProvider source={source}>
          {children}
        </YoutubeMediaPlayerProvider>
      );
  }
}

export function useLocalVideoPlayerContext(): LocalPlayerContext {
  const context = useVideoPlayerContext();

  if (context.type !== "local") {
    throw new Error(
      "useLocalVideoPlayerContext must be used with a local media source"
    );
  }

  return context;
}

export function useYoutubeVideoPlayerContext(): YoutubePlayerContext {
  const context = useVideoPlayerContext();

  if (context.type !== "youtube") {
    throw new Error(
      "useLocalVideoPlayerContext must be used with a local media source"
    );
  }

  return context;
}

function LocalMediaPlayerProvider({
  source,
  children,
}: {
  source: LocalMediaSource;
  children: ReactNode;
}) {
  const player = useVideoPlayer(null, (player) => { player.timeUpdateEventInterval = 0.25 });
  const getTimestamp = useCallback(async () => player.currentTime, [player]);
  const play = useCallback(async () => player.play(), [player]);
  const pause = useCallback(async () => player.pause(), [player]);
  const seekTo = useCallback(async (seconds: number) => { player.currentTime = seconds }, [player]);

  const value = useMemo<VideoScreenContextType>(
    () => ({
      type: "local",
      source,
      player,
      getTimestamp,
      play,
      pause,
      seekTo,
    }),
    [
      source,
      player,
      getTimestamp,
      play,
      pause,
      seekTo,
    ],
  );

  player.play();

  return (
    <VideoScreenContext.Provider value={value}>
      {children}
    </VideoScreenContext.Provider>
  );
}

function YoutubeMediaPlayerProvider({
  source,
  children,
}: {
  source: YoutubeMediaSource;
  children: ReactNode;
}) {
  const playerRef = useRef<YoutubeIframeRef>(null);
  const [playing, setPlaying] = useState(false);

  const getTimestamp = useCallback(async () => {
    if (!playerRef.current) {
      return 0;
    }

    return await playerRef.current.getCurrentTime();
  }, []);

  const play = useCallback(async () => {
    setPlaying(true);
  }, []);

  const pause = useCallback(async () => {
    setPlaying(false);
  }, []);

  const seekTo = useCallback(async (seconds: number) => {
    playerRef.current?.seekTo(seconds, true);
  }, []);

  const onChangeState = useCallback((state: string) => {
    switch (state) {
      case "playing":
        setPlaying(true);
        break;

      case "paused":
      case "ended":
        setPlaying(false);
        break;
    }
  }, []);

  const value = useMemo<YoutubePlayerContext>(
    () => ({
      type: "youtube",
      source,
      player: playerRef,
      playing,
      onChangeState,
      getTimestamp,
      play,
      pause,
      seekTo,
    }),
    [
      source,
      playing,
      onChangeState,
      getTimestamp,
      play,
      pause,
      seekTo,
    ],
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
    throw new Error('useVideoScreenContext must be used inside a VideoScreenProvider');
  }

  return context;
}
