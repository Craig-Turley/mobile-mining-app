import { DefaultSQLiteDownloadDirectory } from "@/lib/file-system";
import { Directory } from "expo-file-system";

export function deleteDicts() {
  const dir = new Directory(DefaultSQLiteDownloadDirectory);

  if (!dir.exists) {
    return;
  }

  for (const item of dir.list()) {
    item.delete();
  }
}

