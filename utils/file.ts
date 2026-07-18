import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

export default async function getFile({ src }: { src: 'file' | 'photos' }) {
  let result;

  if (src === 'file') {
    result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });
  } else if (src === 'photos') {
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsMultipleSelection: false,
      quality: 1,
    });
  }

  if (!result) return;
  if (result.canceled) return;

  return result.assets[0];
}
