import { NativeSpinner } from '@/components/ui/native-spinner';
import { Modal, View, Text } from 'react-native';

export function DictionaryImportOverlay({
  visible,
  label = 'Importing dictionary…',
}: {
  visible: boolean;
  label?: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 items-center justify-center">
        <View className="items-center gap-3 rounded-2xl bg-surfaceElevated p-6 shadow-lg">
          <NativeSpinner />
          <Text className="text-sm font-semibold text-foreground">{label}</Text>
        </View>
      </View>
    </Modal>
  );
}
