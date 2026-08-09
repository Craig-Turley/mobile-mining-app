import { attachAndBuildViews } from "@/db/features/dictionaries/dictionaries.actions";
import { downloadSQLiteDatabase } from "@/lib/file-system/file-system";

export async function downloadRemoteDict(
  url: string,
) {
  await downloadSQLiteDatabase(url);
  await attachAndBuildViews();
}
