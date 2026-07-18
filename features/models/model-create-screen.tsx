import React, { useMemo, useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cssInterop } from 'nativewind';
import { useAppTheme } from '@/theme/theme-provider';
import { ModelFieldName } from '@/lib/flash-card';
import { ModelFields } from '@/lib/flash-card';
import { formDataToModel, createTemplateFormData, ModelFormData } from '@/lib/model-form';
import { generateModelId } from '@/lib/genanki';
import ModelMetaDataSection from './components/model-meta-data-section';
import ModelFieldsSection from './components/model-fields-section';
import ModelTemplatesSection from './components/model-templates-section';
import ModelRulesSection from './components/model-rules-section';
import ModelCssSection from './components/model-css-section';
import { StoredModel } from '@/db/app/schema/models';
import { useUpsertModel } from '@/lib/model-db-hooks';

cssInterop(Ionicons, {
  className: {
    target: 'style',
    nativeStyleToProp: {
      color: true,
    },
  },
});

interface ScreenContentProps {}

export const ModelCreateScreen: React.FC<ScreenContentProps> = () => {
  const { editModelFormData } = useLocalSearchParams<{
    editModelFormData?: string;
  }>();

  const [isUpserting, setIsUpserting] = useState<boolean>(false);

  const upsertModel = useUpsertModel();
  const parsedEditModelFormData = useMemo(() => {
    if (editModelFormData === undefined) return undefined;

    try {
      return JSON.parse(editModelFormData) as StoredModel;
    } catch {
      return undefined;
    }
  }, [editModelFormData]);

  const { colors } = useAppTheme();
  const [form, setForm] = useState<ModelFormData>(() => ({
    id: parsedEditModelFormData ? parsedEditModelFormData.modelFormData.id : generateModelId(),
    name: parsedEditModelFormData ? parsedEditModelFormData.modelFormData.name : 'Name',
    fields: parsedEditModelFormData
      ? parsedEditModelFormData.modelFormData.fields
      : [...ModelFields],
    templates: parsedEditModelFormData
      ? parsedEditModelFormData.modelFormData.templates
      : [createTemplateFormData(0)],
  }));

  const availableFields = form.fields.map((field) => field.name) as readonly ModelFieldName[];

  return (
    <>
      <Stack.Screen
        options={{
          headerTransparent: false,
          headerLargeTitle: false,
          headerTitleStyle: {
            color: colors.foreground,
          },
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerBackButtonDisplayMode: 'minimal',
          title: 'Configure Model',
          headerRight: () => (
            <TouchableOpacity
              className="flex-row items-center gap-2 px-3 py-2"
              activeOpacity={0.7}
              disabled={isUpserting}
              onPress={async () => {
                // TODO: add error handling
                if (isUpserting) return;
                setIsUpserting(true);

                const constructedModel = formDataToModel(form);
                await upsertModel({
                  applicationId: parsedEditModelFormData?.applicationId,
                  modelFormData: form,
                  model: constructedModel,
                });

                router.back();
              }}>
              {isUpserting ? (
                <ActivityIndicator size="small" />
              ) : (
                <>
                  <Ionicons name="push-outline" size={22} className="text-foreground" />
                  <Text className="text-base font-semibold text-foreground">Save</Text>
                </>
              )}
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 8, gap: 16 }}>
        <ModelMetaDataSection
          name={form.name}
          setModelName={(name) =>
            setForm({
              ...form,
              name,
            })
          }
        />
        <ModelFieldsSection
          availableFields={ModelFields}
          currentFields={form.fields}
          setModelFields={(fields) =>
            setForm({
              ...form,
              fields,
            })
          }
        />
        <ModelTemplatesSection
          availableFields={availableFields}
          templates={form.templates}
          setModelTemplates={(templates) => {
            setForm((currentForm) => ({
              ...currentForm,
              templates,
            }));
          }}
        />
        <ModelRulesSection
          availableFields={availableFields}
          templates={form.templates}
          setModelTemplates={(templates) =>
            setForm({
              ...form,
              templates,
            })
          }
        />
        <ModelCssSection />
      </ScrollView>
    </>
  );
};
