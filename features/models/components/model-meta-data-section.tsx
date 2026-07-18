import { View, Text, ViewProps } from 'react-native';
import { FieldLabel } from './field-label';
import { TextInput } from '@/components/text-input';
import { cn } from '@/utils/cn';

export interface ModelMetaDataSectionProps extends ViewProps {
  name: string;
  setModelName: (name: string) => void;
}

export default function ModelMetaDataSection({
  className,
  name,
  setModelName,
  ...rest
}: ModelMetaDataSectionProps) {
  return (
    <View className={cn('gap-6 px-4', className)} {...rest}>
      <Text className="text-2xl font-bold text-foreground">Model Data</Text>

      <View className="gap-2">
        <FieldLabel>Model name</FieldLabel>
        <TextInput
          placeholder="Enter a model name"
          placeholderClassName="text-foreground"
          autoCapitalize="sentences"
          returnKeyType="next"
          onChangeText={(value) => setModelName(value)}
          value={name}
        />
      </View>
    </View>
  );
}
