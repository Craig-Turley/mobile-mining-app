import { deleteFile, saveFile } from '@/lib/file-system';
import { deleteSubtitleQuery, deleteVideoQuery } from './files.queries';
import { createLocalId } from '@/utils/id';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { appDb } from '@/db/app/client';
import { subtitles, videos } from '@/db/app/schema';
import { eq } from 'drizzle-orm';

export type InsertFileEntry = ImagePicker.ImagePickerAsset | DocumentPicker.DocumentPickerAsset;

type FileEntry = {
  id: number;
  name: string;
  relative_path: string;
};

export type VideoFileEntry = FileEntry & {
  subtitle_id: number | null;
};

export type SubtitleFileEntry = FileEntry;

// TODO: handle error case of db deletion but not file deletion
export async function deleteVideo(videoId: number) {
  const [video] = await deleteVideoQuery(videoId);
  if (!video) {
    return;
  }
  deleteFile(video.relativePath);

  if (video.subtitledId !== null) {
    const [subtitle] = await deleteSubtitleQuery(video.subtitledId);
    if (subtitle) {
      deleteFile(subtitle.relativePath);
    }
  }
}

export async function deleteSubtitles(subtitleId: number) {
  const [subtitle] = await deleteSubtitleQuery(subtitleId);
  if (!subtitle) return;

  deleteFile(subtitle.relativePath);
}

// TODO: figure out the below functions
export async function insertVideo(file: InsertFileEntry): Promise<VideoFileEntry> {
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
