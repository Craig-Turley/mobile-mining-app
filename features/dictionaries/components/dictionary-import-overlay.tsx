import { NativeSpinner } from "@/components/ui/native-spinner";
import { Modal, View, Text } from "react-native";

export function DictionaryImportOverlay({
  visible,
  label = "Importing dictionary…",
}: {
  visible: boolean;
  label?: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 items-center justify-center">
        <View className="bg-surfaceElevated rounded-2xl p-6 items-center gap-3 shadow-lg">
          <NativeSpinner />
          <Text className="text-foreground text-sm font-semibold">{label}</Text>
        </View>
      </View>
    </Modal>
  );
}
