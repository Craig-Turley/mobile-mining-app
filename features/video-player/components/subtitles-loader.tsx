import { View, Button } from "react-native";
import { useVideoPlayerContext } from "../contexts/video-screen-context";
import * as DocumentPicker from "expo-document-picker";

export default function SubtitleLoader() {
  const { setSubtitlesUri } = useVideoPlayerContext();

  async function loadSubtitles() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (!result) return;
    if (result.canceled) return;

    setSubtitlesUri(result.assets[0].uri);
  }

  return (
    <View className="flex-1 items-center justify-center bg-background p-2">
      <Button
        title={"Load Subtitles"}
        onPress={loadSubtitles}
      />
    </View>
  );
}
