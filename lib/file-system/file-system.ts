import { Directory, Paths, File } from 'expo-file-system';
import { defaultDatabaseDirectory, } from 'expo-sqlite';
import { unzip } from 'react-native-zip-archive';

export type FilePath = 'videos' | 'subtitles' | 'temp';
export const DefaultSQLiteDirectory = defaultDatabaseDirectory;
export const DefaultSQLiteDownloadDirectory = new Directory(
  DefaultSQLiteDirectory, "downloads"
);

type FileData = {
  id: number;
  uri: string;
  name?: string;
};

function getExtension(fallback: string, name?: string) {
  return name?.split('.').pop() || fallback;
}

export function buildFullPath(relativePath: string) {
  const file = new File(Paths.document, relativePath);
  return file.uri;
}

export function saveFile(file: FileData, filePath: FilePath, extensionFallback: string) {
  const directory = new Directory(Paths.document, filePath);
  directory.create({ intermediates: true, idempotent: true });

  const extension = getExtension(extensionFallback, file.name);
  const destinationName = `${file.id}.${extension}`;

  const source = new File(file.uri);
  const dest = new File(directory, destinationName);

  source.copy(dest);

  return {
    id: file.id,
    localPath: `${filePath}/${destinationName}`,
  };
}

export function deleteFile(filePath: string) {
  const file = new File(Paths.document, filePath);
  if (file.exists) file.delete();
}

export async function downloadFile(url: string, filePath: FilePath) {
  const directory = new Directory(Paths.document, filePath);
  directory.create({ intermediates: true, idempotent: true });

  return File.downloadFileAsync(
    url,
    directory,
    { idempotent: true, },
  );
}

export function getFileName(uri: string) {
  return new File(uri).name;
}

export function getDatabasePath(name: string) {
  return decodeURIComponent(
    `${DefaultSQLiteDirectory.replace(/\/$/, '')}/${name}`
      .replace(/^file:\/\//, ''),
  );
}

export function listDirectoryContents(uri: string): string[] {
  const dir = new Directory(uri);

  dir.create({
    idempotent: true,
    intermediates: true,
  });

  return dir.list().map((item) => item.uri);
}

export function clearDirectory(uri: string) {
  const dir = new Directory(uri);
  if (!dir.exists) {
    return;
  }

  for (const item of dir.list()) {
    item.delete();
  }
}

export async function unzipFile(src: string, dest: string) {
  return unzip(src, dest);
}
