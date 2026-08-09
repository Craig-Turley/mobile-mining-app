import { useMutation } from "@/db/hooks/use-mutation";
import { useState } from "react";
import { downloadRemoteDict } from "../lib/download-remote-dict";
import { NOPMutationMapper } from "@/db/hooks/use-app-live-query";
import { clearDirectory, DefaultSQLiteDownloadDirectory } from "@/lib/file-system";

export function useDictionaryDownload(url: string, onSuccess?: () => void) {
  const [importing, setImporting] = useState(false);

  const mutation = useMutation(
    async () => {
      setImporting(true);
      // let the overlay actually paint before the JS thread locks up
      await new Promise(resolve => requestAnimationFrame(resolve));
      try {
        await downloadRemoteDict(url);
      } catch {
        clearDirectory(DefaultSQLiteDownloadDirectory.uri);
      } finally {
        onSuccess?.()
        setImporting(false);
      }
    },
    NOPMutationMapper,
  );

  return { ...mutation, importing };
}
