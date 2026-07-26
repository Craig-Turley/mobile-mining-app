import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { subtitleByIdQuery, videoByIdQuery, videosQuery } from '@/db/repositories/files.repository';

type FileEntry = {
  id: number;
  name: string;
  relative_path: string;
};

export type VideoFileEntry = FileEntry & {
  subtitle_id: number | null;
};

export type SubtitleFileEntry = FileEntry;

export function useVideos() {
  const query = useLiveQuery(videosQuery);

  return {
    ...query,
    videos: query.data ?? [],
    isLoading: query.updatedAt === undefined && !query.error,
  };
}

export function useVideoData(id: number | null | undefined) {
  const query = useLiveQuery(videoByIdQuery(id));

  return {
    ...query,
    video: query.data?.[0] ?? null,
    isLoading: query.updatedAt === undefined && !query.error,
  };
}

export function useSubtitleData(id: number | null | undefined) {
  const query = useLiveQuery(subtitleByIdQuery(id));

  return {
    ...query,
    subtitle: query.data?.[0] ?? null,
    isLoading: query.updatedAt === undefined && !query.error,
  };
}
