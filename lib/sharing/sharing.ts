import * as Sharing from 'expo-sharing';

export const AnkiSharingOptions = {
  dialogTitle: 'Open Anki deck',
  mimeType: 'application/octet-stream',
  UTI: 'public.data',
};

/**
 * Function for exporting to Anki 
 * use AnkiSharingOptions as default export options to Anki
 */
export async function shareFile(fileUri: string, options: Sharing.SharingOptions = {}) {
  const sharingAvailable = await Sharing.isAvailableAsync();

  if (!sharingAvailable) {
    throw new Error('File sharing is not available on this device.');
  }

  await Sharing.shareAsync(fileUri, options);
}
