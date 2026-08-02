import { View, ViewProps, Text, Switch } from 'react-native';
import { AllowedModelField, modelFieldLabels } from '@/lib/anki-settings';
import { AnkiModelFields } from '@/lib/anki-settings/anki-settings.types';

export interface ModelFieldsSectionProps extends ViewProps {
  availableFields: readonly AllowedModelField[];
  currentFields: readonly AllowedModelField[];
  setModelFields: (flds: AllowedModelField[]) => void;
}

export default function ModelFieldsSection({
  className,
  availableFields,
  currentFields,
  setModelFields,
  ...rest
}: ModelFieldsSectionProps) {
  return (
    <View className="gap-2 overflow-hidden px-3" {...rest}>
      <Text className="text-2xl font-bold text-foreground">Fields</Text>

      <View className="rounded-[10px] bg-surface">
        {availableFields.map((field, index) => {
          const isLast = index === Object.keys(AnkiModelFields).length - 1;
          const enabled = Boolean(currentFields.find((f) => f.name == field.name));

          return (
            <View key={field.name} className="min-h-[50px] flex-row items-center px-4">
              <Text className="flex-1 text-[17px] leading-[22px] text-foreground">
                {modelFieldLabels[field.name]}
              </Text>

              <View>
                <Switch
                  value={enabled}
                  onValueChange={(enabled) => {
                    if (enabled) {
                      setModelFields([...currentFields, field]);
                    } else {
                      setModelFields([...currentFields].filter((f) => f.name != field.name));
                    }
                  }}
                  accessibilityLabel={`Include ${field.name}`}
                />
              </View>

              {!isLast && (
                <View className="absolute bottom-0 left-4 right-0 h-px bg-surfaceElevated" />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
