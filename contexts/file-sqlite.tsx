import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Text, View } from "react-native";
import type { SQLiteDatabase } from "expo-sqlite";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { openFileDb } from "@/lib/sqlite";

type InsertFileEntry =
  | ImagePicker.ImagePickerAsset
  | DocumentPicker.DocumentPickerAsset;

type FileEntry = {
  id: number;
  name: string;
  uri: string;
};

type VideoFileEntry = FileEntry & {
  subtitle_id: number | null;
};

type SubtitleFileEntry = FileEntry;

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
  const [fileDb, setFileDb] = useState<SQLiteDatabase | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        const db = await openFileDb();

        await db.execAsync(`
          PRAGMA foreign_keys = ON;

          CREATE TABLE IF NOT EXISTS subtitles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            uri TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            uri TEXT NOT NULL,
            subtitle_id INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (subtitle_id) REFERENCES subtitles(id)
              ON DELETE SET NULL
          );

          CREATE INDEX IF NOT EXISTS idx_videos_subtitle_id
            ON videos(subtitle_id);
        `);

        if (!cancelled) {
          setFileDb(db);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
        }
      }
    }

    setup();

    return () => {
      cancelled = true;
    };
  }, []);

  const getFiles = useCallback(async (): Promise<VideoFileEntry[]> => {
    if (!fileDb) {
      throw new Error("File database is not ready");
    }

    return fileDb.getAllAsync<VideoFileEntry>(
      "SELECT id, name, uri, subtitle_id FROM videos"
    );
  }, [fileDb]);

  const getVideoData = useCallback(
    async (id: number): Promise<VideoFileEntry | null> => {
      if (!fileDb) {
        throw new Error("File database is not ready");
      }

      return fileDb.getFirstAsync<VideoFileEntry>(
        "SELECT id, name, uri, subtitle_id FROM videos WHERE id = ?",
        [id]
      );
    },
    [fileDb]
  );

  const getSubtitleData = useCallback(
    async (id: number): Promise<SubtitleFileEntry | null> => {
      if (!fileDb) {
        throw new Error("File database is not ready");
      }

      return fileDb.getFirstAsync<SubtitleFileEntry>(
        "SELECT id, name, uri FROM subtitles WHERE id = ?",
        [id]
      );
    },
    [fileDb]
  );

  const insertVideo = useCallback(
    async (file: InsertFileEntry): Promise<VideoFileEntry> => {
      if (!fileDb) {
        throw new Error("File database is not ready");
      }

      const name = getFileName(file);
      const subtitleId = null;

      const result = await fileDb.runAsync(
        "INSERT INTO videos (name, uri, subtitle_id) VALUES (?, ?, ?)",
        [name, file.uri, subtitleId]
      );

      return {
        id: result.lastInsertRowId,
        name,
        uri: file.uri,
        subtitle_id: subtitleId,
      };
    },
    [fileDb]
  );

  const insertSubtitle = useCallback(
    async (
      videoId: number,
      file: InsertFileEntry
    ): Promise<SubtitleFileEntry> => {
      if (!fileDb) {
        throw new Error("File database is not ready");
      }

      const name = getFileName(file);

      let subtitle: SubtitleFileEntry | null = null;

      await fileDb.withTransactionAsync(async () => {
        const result = await fileDb.runAsync(
          "INSERT INTO subtitles (name, uri) VALUES (?, ?)",
          [name, file.uri]
        );

        const subtitleId = result.lastInsertRowId;

        const updateResult = await fileDb.runAsync(
          "UPDATE videos SET subtitle_id = ? WHERE id = ?",
          [subtitleId, videoId]
        );

        if (updateResult.changes === 0) {
          throw new Error(`Video with id ${videoId} was not found`);
        }

        subtitle = {
          id: subtitleId,
          name,
          uri: file.uri,
        };
      });

      if (!subtitle) {
        throw new Error("Failed to insert subtitle");
      }

      return subtitle;
    },
    [fileDb]
  );

  const value = useMemo<FileDbContextValue | null>(() => {
    if (!fileDb) return null;

    return {
      getVideos: getFiles,
      getVideoData,
      getSubtitleData,
      insertVideo,
      insertSubtitle,
    };
  }, [
    fileDb,
    getFiles,
    getVideoData,
    getSubtitleData,
    insertVideo,
    insertSubtitle,
  ]);

  if (error) {
    return (
      <View style={{ padding: 16 }}>
        <Text>Failed to load file database.</Text>
        <Text>{String(error)}</Text>
      </View>
    );
  }

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
