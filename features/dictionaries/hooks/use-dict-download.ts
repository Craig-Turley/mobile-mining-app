import { useMutation } from "@/db/hooks/use-mutation";
import { useState } from "react";
import { downloadRemoteDict } from "../lib/download-remote-dict";
import { NOPMutationMapper } from "@/db/hooks/use-app-live-query";
import { clearDirectory, DefaultSQLiteDownloadDirectory } from "@/lib/file-system";

export function useDictionaryDownload(
  url: string,
  onSuccess?: () => void,
) {
  const [importing, setImporting] = useState(false);
  const mutation = useMutation(
    async () => {
      setImporting(true);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );

      try {
        await downloadRemoteDict(url);
        onSuccess?.();
      } catch (error) {
        clearDirectory(DefaultSQLiteDownloadDirectory.uri);
        throw error;
      } finally {
        setImporting(false);
      }
    },
    NOPMutationMapper,
  );

  return {
    ...mutation,
    importing,
  };
}
