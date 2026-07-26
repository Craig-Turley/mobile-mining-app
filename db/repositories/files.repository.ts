import { eq } from 'drizzle-orm';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { appDb } from '@/db/app/client';
import { subtitles, videos } from '@/db/app/schema';
import { saveFile } from '@/lib/file-system';
import { createLocalId } from '@/utils/id';

export type InsertFileEntry =
  | ImagePicker.ImagePickerAsset
  | DocumentPicker.DocumentPickerAsset;

type FileEntry = {
  id: number;
  name: string;
  relative_path: string;
};

export type VideoFileEntry = FileEntry & {
  subtitle_id: number | null;
};

export type SubtitleFileEntry = FileEntry;

export const videosQuery = appDb
  .select({
    id: videos.id,
    name: videos.name,
    relative_path: videos.relativePath,
    subtitle_id: videos.subtitleId,
  })
  .from(videos);

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

export async function getVideos(): Promise<VideoFileEntry[]> {
  return videosQuery;
}

export async function getVideoById(
  id: number
): Promise<VideoFileEntry | null> {
  const [video] = await videoByIdQuery(id);

  return video ?? null;
}

export async function getSubtitleById(
  id: number
): Promise<SubtitleFileEntry | null> {
  const [subtitle] = await subtitleByIdQuery(id);

  return subtitle ?? null;
}

export async function insertVideo(
  file: InsertFileEntry
): Promise<VideoFileEntry> {
  const id = createLocalId();
  const name = getFileName(file);
  const subtitleId = null;

  const result = saveFile(
    {
      id,
      name,
      uri: file.uri,
    },
    'videos',
    'mp4'
  );

  await appDb.insert(videos).values({
    id,
    name,
    relativePath: result.localPath,
    subtitleId,
  });

  return {
    id,
    name,
    relative_path: result.localPath,
    subtitle_id: subtitleId,
  };
}

export async function insertSubtitle(
  videoId: number,
  file: InsertFileEntry
): Promise<SubtitleFileEntry> {
  const id = createLocalId();
  const name = getFileName(file);

  const result = saveFile(
    {
      id,
      name,
      uri: file.uri,
    },
    'subtitles',
    'srt'
  );

  return appDb.transaction(async (tx) => {
    await tx.insert(subtitles).values({
      id,
      name,
      relativePath: result.localPath,
    });

    const [updatedVideo] = await tx
      .update(videos)
      .set({
        subtitleId: id,
      })
      .where(eq(videos.id, videoId))
      .returning({
        id: videos.id,
      });

    if (!updatedVideo) {
      throw new Error(`Video with id ${videoId} was not found`);
    }

    return {
      id,
      name,
      relative_path: result.localPath,
    };
  });
}

function getFileName(file: InsertFileEntry): string {
  if ('name' in file && file.name) {
    return file.name;
  }

  if ('fileName' in file && file.fileName) {
    return file.fileName;
  }

  return file.uri.split('/').pop() ?? 'untitled';
}
