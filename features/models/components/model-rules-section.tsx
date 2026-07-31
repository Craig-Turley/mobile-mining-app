import { View, ViewProps, Text, Pressable } from 'react-native';
import { cn } from '@/utils/cn';
import { FieldLabel } from './field-label';
import { RequirementModes } from 'genanki-ts';
import { modelFieldLabels, ModelFieldName } from '@/lib/flash-card';
import { TemplateFormData } from '@/lib/model-form';

export interface ModelRulesSectionProps extends ViewProps {
  availableFields: readonly ModelFieldName[];
  templates: TemplateFormData[];
  setModelTemplates: (templates: TemplateFormData[]) => void;
}

export default function ModelRulesSection({
  className,
  availableFields,
  templates,
  setModelTemplates,
  ...rest
}: ModelRulesSectionProps) {
  const updateRuleMode = (templateIndex: number, mode: TemplateFormData['rule']['mode']) => {
    setModelTemplates(
      templates.map((template, index) =>
        index === templateIndex
          ? {
              ...template,
              rule: {
                ...template.rule,
                mode,
              },
            }
          : template
      )
    );
  };

  const toggleRuleField = (templateIndex: number, field: ModelFieldName) => {
    setModelTemplates(
      templates.map((template, index) => {
        if (index !== templateIndex) {
          return template;
        }

        const nextFields = template.rule.fields.includes(field)
          ? template.rule.fields.filter((currentField) => currentField !== field)
          : [...template.rule.fields, field];

        return {
          ...template,
          rule: {
            ...template.rule,
            fields: nextFields,
          },
        };
      })
    );
  };

  return (
    <View className={cn('flex-1 gap-4 overflow-hidden px-3', className)} {...rest}>
      <Text className="text-2xl font-bold text-foreground">Rules</Text>

      <FieldLabel>
        A card is only generated when its rule is satisfied by the note&apos;s filled fields.
      </FieldLabel>

      {templates.map((template, templateIndex) => (
        <View key={template.id} className="flex-1 rounded-xl bg-surface p-3">
          <View className="w-full flex-row justify-between">
            <Text className="text-lg font-semibold text-foreground">{template.name}</Text>

            <Text className="text-mutedForeground">Template #{templateIndex + 1}</Text>
          </View>

          <View className="mt-4 gap-3">
            <View className="flex-row flex-wrap items-center gap-2">
              <Text className="text-mutedForeground">MATCH</Text>

              {RequirementModes.map((mode) => {
                const selected = template.rule.mode === mode;

                return (
                  <Pressable
                    key={mode}
                    className={cn(
                      'rounded-full px-2.5 py-2',
                      selected ? 'bg-foreground' : 'border border-border'
                    )}
                    onPress={() => updateRuleMode(templateIndex, mode)}>
                    <Text
                      className={cn(
                        'text-[12px] font-medium',
                        selected ? 'text-primary-foreground' : 'text-mutedForeground'
                      )}>
                      {mode}
                    </Text>
                  </Pressable>
                );
              })}

              <Text className="text-mutedForeground">OF</Text>
            </View>

            <View className="flex-row flex-wrap items-center gap-2">
              {availableFields.map((field) => {
                const selected = template.rule.fields.includes(field) ?? false;

                return (
                  <Pressable
                    key={field}
                    className={cn(
                      'rounded-full px-2.5 py-2',
                      selected ? 'bg-primary' : 'border border-border'
                    )}
                    onPress={() => toggleRuleField(templateIndex, field)}>
                    <Text
                      className={cn(
                        'text-[12px] font-medium',
                        selected ? 'text-primary-foreground' : 'text-mutedForeground'
                      )}>
                      {modelFieldLabels[field]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
