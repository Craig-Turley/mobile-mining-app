import { eq } from 'drizzle-orm';
import { appDb } from '@/db/app/client';
import { subtitles, videos } from '@/db/app/schema';
import { deleteFile } from '@/lib/file-system';

export function videosQuery() {
  return appDb
    .select({
      id: videos.id,
      name: videos.name,
      relative_path: videos.relativePath,
      subtitle_id: videos.subtitleId,
    })
    .from(videos);
}

export function videoByIdQuery(id: number | null | undefined) {
  return appDb
    .select({
      id: videos.id,
      name: videos.name,
      relative_path: videos.relativePath,
      subtitle_id: videos.subtitleId,
    })
    .from(videos)
    .where(eq(videos.id, id ?? -1))
    .limit(1);
}

export function subtitleByIdQuery(id: number | null | undefined) {
  return appDb
    .select({
      id: subtitles.id,
      name: subtitles.name,
      relative_path: subtitles.relativePath,
    })
    .from(subtitles)
    .where(eq(subtitles.id, id ?? -1))
    .limit(1);
}

export function deleteVideoQuery(videoId: number) {
  return appDb.delete(videos).where(eq(videos.id, videoId)).returning({
    id: videos.id,
    name: videos.name,
    relativePath: videos.relativePath,
    subtitledId: videos.subtitleId,
  });
}

export function deleteSubtitleQuery(subtitleId: number) {
  return appDb.delete(subtitles).where(eq(subtitles.id, subtitleId)).returning({
    id: subtitles.id,
    name: subtitles.name,
    relativePath: subtitles.relativePath,
  });
}

export async function deleteSubtitles(subtitleId: number) {
  const [subtitle] = await deleteSubtitleQuery(subtitleId);
  if (!subtitle) return;

  deleteFile(subtitle.relativePath);
}
