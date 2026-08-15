import { attachAndBuildViews } from "@/db/features/dictionaries/dictionaries.actions";
import { DefaultSQLiteDownloadDirectory, downloadFile, unzipFile } from "@/lib/file-system/file-system";

export async function downloadRemoteDict(url: string) {
  const file = await downloadFile(url, 'temp');
  await unzipFile(file.uri, DefaultSQLiteDownloadDirectory.uri);
  if (file.exists) file.delete();
  await attachAndBuildViews();
}
