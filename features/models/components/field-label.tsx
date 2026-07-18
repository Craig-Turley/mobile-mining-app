import { Text } from 'react-native';

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text className="mb-1.5 text-mutedForeground">{children}</Text>;
}
