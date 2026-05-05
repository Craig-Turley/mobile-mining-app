import { View, Text, TouchableOpacity } from "react-native";
import { useVideoPlayerContext } from "../contexts/video-screen-context";
import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

export default function VideoLoader() {
  const { setVideoUri } = useVideoPlayerContext();

  async function getVideo({ src }: { src: "file" | "photos" }) {
    let result;

    if (src === "file") {
      result = await DocumentPicker.getDocumentAsync({
        type: "video/*",
        copyToCacheDirectory: true,
        multiple: false,
      });
    } else if (src === "photos") {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsMultipleSelection: false,
        quality: 1,
      });
    }

    if (!result) return;
    if (result.canceled) return;

    const file = result.assets[0];
    setVideoUri(file.uri);
  }

  return (
    <View className="flex-1 items-start bg-background p-2">
      <TouchableOpacity
        onPress={() => getVideo({ src: "file" })}
        className="w-full border-y border-border py-3"
      >
        <View className="flex-row items-center gap-2">
          <Ionicons name="folder-outline" size={28} />
          <Text className="text-foreground">Upload from Files</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => getVideo({ src: "photos" })}
        className="w-full border-y border-border py-3"
      >
        <View className="flex-row items-center gap-2">
          <Ionicons name="images-outline" size={28} />
          <Text className="text-foreground">Upload from Photos</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}
