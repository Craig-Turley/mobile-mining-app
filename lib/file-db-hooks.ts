import { useCallback } from "react";
import { eq } from "drizzle-orm";
import { createLocalId } from "@/utils/id";
import { saveFile } from "@/lib/file-system";
import { filesDb } from "@/db/files/client";
import { subtitles, videos } from "@/db/files/schema";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

type InsertFileEntry =
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

export function useVideos() {
  const query = useLiveQuery(
    filesDb
      .select({
        id: videos.id,
        name: videos.name,
        relative_path: videos.relativePath,
        subtitle_id: videos.subtitleId,
      })
      .from(videos)
  );

  return {
    ...query,
    isLoading: !query.updatedAt,
  };
}

export function useVideoData(id: number | null | undefined) {
  const query = useLiveQuery(
    filesDb
      .select({
        id: videos.id,
        name: videos.name,
        relative_path: videos.relativePath,
        subtitle_id: videos.subtitleId,
      })
      .from(videos)
      .where(eq(videos.id, id ?? -1))
      .limit(1)
  );

  return {
    ...query,
    isLoading: !query.updatedAt,
  };
}

export function useSubtitleData(id: number | null | undefined) {
  const query = useLiveQuery(
    filesDb
      .select({
        id: subtitles.id,
        name: subtitles.name,
        relative_path: subtitles.relativePath,
      })
      .from(subtitles)
      .where(eq(subtitles.id, id ?? -1))
      .limit(1)
  );

  return {
    ...query,
    isLoading: !query.updatedAt,
  };
}

export function useInsertVideo() {
  return useCallback(
    async (file: InsertFileEntry): Promise<VideoFileEntry> => {
      const id = createLocalId();
      const name = getFileName(file);
      const subtitleId = null;

      const result = saveFile(
        { id, name, uri: file.uri },
        "videos",
        "mp4"
      );

      await filesDb.insert(videos).values({
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
    },
    []
  );
}

export function useInsertSubtitle() {
  return useCallback(
    async (
      videoId: number,
      file: InsertFileEntry
    ): Promise<SubtitleFileEntry> => {
      const id = createLocalId();
      const name = getFileName(file);

      return filesDb.transaction(async tx => {
        const result = saveFile(
          { id, name, uri: file.uri },
          "subtitles",
          "srt"
        );

        await tx.insert(subtitles).values({
          id,
          name,
          relativePath: result.localPath,
        });

        const updatedVideos = await tx
          .update(videos)
          .set({
            subtitleId: id,
          })
          .where(eq(videos.id, videoId))
          .returning({
            id: videos.id,
          });

        if (updatedVideos.length === 0) {
          throw new Error(`Video with id ${videoId} was not found`);
        }

        return {
          id,
          name,
          relative_path: result.localPath,
        };
      });
    },
    []
  );
}

const getFileName = (file: InsertFileEntry): string => {
  if ("name" in file && file.name) {
    return file.name;
  }

  if ("fileName" in file && file.fileName) {
    return file.fileName;
  }

  return file.uri.split("/").pop() ?? "untitled";
};
