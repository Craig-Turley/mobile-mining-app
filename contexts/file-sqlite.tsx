import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { eq } from "drizzle-orm";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";

import { createLocalId } from "@/utils/id";
import { saveFile } from "@/lib/file-system";
import { filesDb } from "@/db/files/client";
import { subtitles, videos } from "@/db/files/schema";
import filesMigrations from "../drizzle/files/migrations";

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

type FileDbContextValue = {
  getVideos: () => Promise<VideoFileEntry[]>;
  getVideoData: (id: number) => Promise<VideoFileEntry | null>;
  getSubtitleData: (id: number) => Promise<SubtitleFileEntry | null>;
  insertVideo: (file: InsertFileEntry) => Promise<VideoFileEntry>;
  insertSubtitle: (videoId: number, file: InsertFileEntry) => Promise<SubtitleFileEntry>;
};

const FileDbContext = createContext<FileDbContextValue | null>(null);

type FileProviderProps = {
  children: ReactNode;
};

export function FileProvider({ children }: FileProviderProps) {
  // const filesMigrationState = useMigrations(filesDb, filesMigrations);

  const getVideos = useCallback(async (): Promise<VideoFileEntry[]> => {
    return filesDb
      .select({
        id: videos.id,
        name: videos.name,
        relative_path: videos.relativePath,
        subtitle_id: videos.subtitleId,
      })
      .from(videos);
  }, []);

  const getVideoData = useCallback(
    async (id: number): Promise<VideoFileEntry | null> => {
      const rows = await filesDb
        .select({
          id: videos.id,
          name: videos.name,
          relative_path: videos.relativePath,
          subtitle_id: videos.subtitleId,
        })
        .from(videos)
        .where(eq(videos.id, id))
        .limit(1);

      return rows[0] ?? null;
    },
    []
  );

  const getSubtitleData = useCallback(
    async (id: number): Promise<SubtitleFileEntry | null> => {
      const rows = await filesDb
        .select({
          id: subtitles.id,
          name: subtitles.name,
          relative_path: subtitles.relativePath,
        })
        .from(subtitles)
        .where(eq(subtitles.id, id))
        .limit(1);

      return rows[0] ?? null;
    },
    []
  );

  const insertVideo = useCallback(
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

  const insertSubtitle = useCallback(
    async (
      videoId: number,
      file: InsertFileEntry
    ): Promise<SubtitleFileEntry> => {
      const id = createLocalId();
      const name = getFileName(file);

      return filesDb.transaction(async (tx) => {
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

        tx.select({ id: subtitles.id }).from(subtitles).where(eq(subtitles.id, id)).then((d) => {
          console.log("result", d);
        })

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

        console.log(updatedVideos[0]);

        return {
          id,
          name,
          relative_path: result.localPath,
        };
      });
    },
    []
  );

  const value = useMemo<FileDbContextValue>(
    () => ({
      getVideos,
      getVideoData,
      getSubtitleData,
      insertVideo,
      insertSubtitle,
    }),
    [
      getVideos,
      getVideoData,
      getSubtitleData,
      insertVideo,
      insertSubtitle,
    ]
  );

  // if (filesMigrationState.error) {
  //   return (
  //     <SafeAreaView edges={["top", "bottom", "left", "right"]}>
  //       <Text className="text-foreground">Database setup failed.</Text>
  //       <Text className="text-foreground">
  //         {filesMigrationState.error.message}
  //       </Text>
  //     </SafeAreaView>
  //   );
  // }
  //
  // if (!filesMigrationState.success) {
  //   return (
  //     <SafeAreaView edges={["top", "bottom", "left", "right"]}>
  //       <Text className="text-foreground">Preparing databases...</Text>
  //     </SafeAreaView>
  //   );
  // }

  return (
    <FileDbContext.Provider value={value}>
      {children}
    </FileDbContext.Provider>
  );
}

export function useFileDb() {
  const context = useContext(FileDbContext);

  if (!context) {
    throw new Error("useFileDb must be used inside FileProvider");
  }

  return context;
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
