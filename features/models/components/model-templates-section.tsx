import { View, ViewProps, Text, Pressable } from 'react-native';
import { cn } from '@/utils/cn';
import { TextInput } from '@/components/text-input';
import { FieldLabel } from './field-label';
import {
  BackSideModelFields,
  FrontSideModelFields,
  modelFieldLabels,
  ModelFieldName,
} from '@/lib/flash-card';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/theme-provider';
import { createTemplateFormData, TemplateFormData } from '@/lib/model-form';

export interface ModelTemplatesSectionProps extends ViewProps {
  availableFields: readonly ModelFieldName[];
  templates: TemplateFormData[];
  setModelTemplates: (tmpls: TemplateFormData[]) => void;
}

export default function ModelTemplatesSection({
  className,
  templates,
  setModelTemplates,
  ...rest
}: ModelTemplatesSectionProps) {
  const { colors } = useAppTheme();
  const [currentTemplateIdx, setCurrentTemplateIdx] = useState(0);
  const currentTemplate = templates[currentTemplateIdx];

  const updateCurrentTemplate = (updates: Partial<TemplateFormData>) => {
    if (!currentTemplate) {
      return;
    }

    const nextTemplates = templates.map((template, index) =>
      index === currentTemplateIdx
        ? {
            ...template,
            ...updates,
          }
        : template
    );

    setModelTemplates(nextTemplates);
  };
  const toggleCurrentTemplateField = (
    side: 'frontFields' | 'backFields',
    field: ModelFieldName
  ) => {
    if (!currentTemplate) {
      return;
    }

    const currentFields = currentTemplate[side];

    const nextFields = currentFields.includes(field)
      ? currentFields.filter((current) => current !== field)
      : [...currentFields, field];

    updateCurrentTemplate({
      [side]: nextFields,
    });
  };

  const addTemplate = () => {
    const nextTemplate = createTemplateFormData(templates.length);

    setModelTemplates([...templates, nextTemplate]);

    setCurrentTemplateIdx(templates.length);
  };

  const deleteCurrentTemplate = () => {
    if (templates.length <= 1) {
      return;
    }

    const nextTemplates = templates.filter((_, index) => index !== currentTemplateIdx);

    setModelTemplates(nextTemplates);

    setCurrentTemplateIdx(Math.min(currentTemplateIdx, nextTemplates.length - 1));
  };

  return (
    <View className={cn('flex-1 gap-4 overflow-hidden px-3', className)} {...rest}>
      <Text className="text-2xl font-bold text-foreground">Templates</Text>

      <View className="flex-1 flex-row flex-wrap gap-1.5">
        {templates.map((template, index) => (
          <Pressable
            key={template.id}
            onPress={() => setCurrentTemplateIdx(index)}
            className={cn(
              'shrink-0 rounded-full px-3 py-2',
              currentTemplateIdx === index ? 'bg-foreground' : 'border border-border bg-surface'
            )}>
            <Text
              className={cn(
                'text-[12px] font-medium',
                currentTemplateIdx === index ? 'text-primary-foreground' : 'text-mutedForeground'
              )}>
              {template.name}
            </Text>
          </Pressable>
        ))}

        <Pressable
          className="border-border/60 shrink-0 flex-row items-center gap-1 rounded-full border border-dashed px-2 py-1"
          onPress={addTemplate}>
          <Ionicons color={colors.mutedForeground} name="add" size={14} />

          <Text className="text-mutedForeground">New</Text>
        </Pressable>
      </View>

      <View className="gap-2">
        <FieldLabel>Template Name</FieldLabel>

        <TextInput
          value={currentTemplate?.name ?? ''}
          placeholder="Enter template name"
          editable={Boolean(currentTemplate)}
          onChangeText={(name) => updateCurrentTemplate({ name })}
        />
      </View>

      <FieldLabel>
        Tap fields to choose what appears on each side. The back always shows the front first, then
        the fields you pick below.
      </FieldLabel>

      <View className="flex-1 rounded-xl bg-surface p-3">
        <View>
          <Text className="text-lg font-semibold text-foreground">Front Side</Text>

          <Text className="text-mutedForeground">What you see before flipping</Text>
        </View>

        <View className="mt-4 flex-row flex-wrap gap-2">
          {FrontSideModelFields.map((field) => {
            const enabled = currentTemplate?.frontFields.includes(field.name) ?? false;

            return (
              <Pressable
                key={field.name}
                className={cn(
                  'rounded-full px-2.5 py-2',
                  enabled ? 'bg-primary' : 'border border-border'
                )}
                onPress={() => toggleCurrentTemplateField('frontFields', field.name)}>
                <Text
                  className={cn(
                    'text-[12px] font-medium',
                    enabled ? 'text-primary-foreground' : 'text-mutedForeground'
                  )}>
                  {modelFieldLabels[field.name]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="flex-1 rounded-xl bg-surface p-3">
        <View>
          <Text className="text-lg font-semibold text-foreground">Back Side</Text>

          <Text className="text-mutedForeground">Revealed after flipping</Text>
        </View>

        <View className="mt-4 flex-row flex-wrap gap-2">
          {BackSideModelFields.map((field) => {
            const enabled = currentTemplate.backFields.includes(field.name) ?? false;

            return (
              <Pressable
                key={field.name}
                className={cn(
                  'rounded-full px-2.5 py-2',
                  enabled ? 'bg-foreground' : 'border border-border'
                )}
                onPress={() => toggleCurrentTemplateField('backFields', field.name)}>
                <Text
                  className={cn(
                    'text-[12px] font-medium',
                    enabled ? 'text-primary-foreground' : 'text-mutedForeground'
                  )}>
                  {modelFieldLabels[field.name]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {templates.length > 1 && (
        <Pressable
          className="flex-row items-center justify-center gap-1.5 rounded-2xl border border-destructive px-3 py-2"
          onPress={deleteCurrentTemplate}>
          <Ionicons name="trash" size={14} color={colors.destructive} />

          <Text className="text-destructive">Delete Template</Text>
        </Pressable>
      )}
    </View>
  );
}
