import { Directory, Paths, File } from 'expo-file-system';

export type FilePath = 'videos' | 'subtitles';

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
