import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { SubtitleCue } from '@/lib/subtitles';
import { useVideoPlayerContext } from './video-screen-context';

type SubtitlePlayerContextValue = {
  subtitles: SubtitleCue[];
  activeSubtitleIndex: number;
  activeSubtitle: SubtitleCue | null;

  nextSubtitle: () => void;
  previousSubtitle: () => void;
  replayCurrentSubtitle: () => void;

  setSubtitles: React.Dispatch<React.SetStateAction<SubtitleCue[]>>;
  setActiveSubtitleIndex: React.Dispatch<React.SetStateAction<number>>;
};

const SubtitlePlayerContext =
  createContext<SubtitlePlayerContextValue | null>(null);

export function SubtitlePlayerProvider({ children }: PropsWithChildren) {
  const { seekTo } = useVideoPlayerContext();

  const [subtitles, setSubtitles] = useState<SubtitleCue[]>([]);
  const [activeSubtitleIndex, setActiveSubtitleIndex] = useState(-1);

  const activeSubtitle =
    activeSubtitleIndex >= 0
      ? subtitles[activeSubtitleIndex] ?? null
      : null;

  const nextSubtitle = useCallback(() => {
    const nextIndex = activeSubtitleIndex + 1;

    const cue = subtitles[nextIndex];
    if (!cue) return;

    void seekTo(cue.start);
  }, [activeSubtitleIndex, subtitles, seekTo]);

  const previousSubtitle = useCallback(() => {
    const previousIndex = activeSubtitleIndex - 1;

    const cue = subtitles[previousIndex];
    if (!cue) return;

    void seekTo(cue.start);
  }, [activeSubtitleIndex, subtitles, seekTo]);

  const replayCurrentSubtitle = useCallback(() => {
    if (!activeSubtitle) return;

    void seekTo(activeSubtitle.start);
  }, [activeSubtitle, seekTo]);

  const value = useMemo(
    () => ({
      subtitles,
      activeSubtitleIndex,
      activeSubtitle,

      nextSubtitle,
      previousSubtitle,
      replayCurrentSubtitle,

      setSubtitles,
      setActiveSubtitleIndex,
    }),
    [
      subtitles,
      activeSubtitleIndex,
      activeSubtitle,
      nextSubtitle,
      previousSubtitle,
      replayCurrentSubtitle,
    ],
  );

  return (
    <SubtitlePlayerContext.Provider value={value}>
      {children}
    </SubtitlePlayerContext.Provider>
  );
}

export function useSubtitlePlayerContext() {
  const context = useContext(SubtitlePlayerContext);

  if (!context) {
    throw new Error(
      'useSubtitlePlayerContext must be used inside SubtitlePlayerProvider',
    );
  }

  return context;
}
