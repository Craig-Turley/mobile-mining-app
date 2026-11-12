import { Alert } from "react-native";

export function clearQueue(onPress: () => void) {
  Alert.alert(
    'Clear export queue?',
    'Would you like to remove the exported entries from the queue?',
    [
      {
        text: 'No',
        style: 'cancel',
      },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: onPress,
      },
    ],
    { cancelable: true }
  );
}
