import React, { useMemo, useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cssInterop } from 'nativewind';
import { useAppTheme } from '@/theme/theme-provider';
import { ModelFields, createTemplateFormData } from '@/lib/anki-settings';
import type {
  StoredModel,
  ModelFormData,
  AllowedModelField,
  NoteFieldName,
} from '@/db/app/schema/models';
import { useMutation } from '@/db/hooks/use-mutation';
import { upsertModelQuery } from '@/db/features/models/models.queries';
import { NOPMutationMapper } from '@/db/hooks/use-app-live-query';
import { generateModelId } from '@/lib/genanki/index';
import ModelMetaDataSection from './components/model-meta-data-section';
import ModelFieldsSection from './components/model-fields-section';
import ModelTemplatesSection from './components/model-templates-section';
import ModelRulesSection from './components/model-rules-section';

cssInterop(Ionicons, {
  className: {
    target: 'style',
    nativeStyleToProp: {
      color: true,
    },
  },
});

interface ScreenContentProps { }

export const ModelCreateScreen: React.FC<ScreenContentProps> = () => {
  const { editModelFormData } = useLocalSearchParams<{
    editModelFormData?: string;
  }>();

  const { mutate: upsertModel, isPending: isUpserting } = useMutation(
    upsertModelQuery,
    NOPMutationMapper
  );
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
      : ModelFields.map(({ name }) => ({ name })),
    templates: parsedEditModelFormData
      ? parsedEditModelFormData.modelFormData.templates
      : [
        createTemplateFormData(
          0,
          ModelFields.map(({ name }) => name)
        ),
      ],
  }));

  const availableFields = form.fields.map((field) => field.name);

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
                if (isUpserting) return;

                await upsertModel({
                  applicationId: parsedEditModelFormData?.applicationId,
                  modelFormData: form,
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

      <KeyboardAvoidingView
        className='flex-1 my-4'
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          className="flex-1 bg-background"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingBottom: 8, gap: 16 }}>
          <ModelMetaDataSection
            name={form.name}
            setModelName={(name) => {
              setForm((currentForm) => ({
                ...currentForm,
                name,
              }));
            }}
          />
          <ModelFieldsSection
            availableFields={ModelFields}
            currentFields={form.fields}
            setModelFields={(fields: AllowedModelField[]) => {
              const allowedFieldNames = new Set<NoteFieldName>(fields.map((field) => field.name));

              setForm((currentForm) => ({
                ...currentForm,
                fields,
                templates: currentForm.templates.map((template) => ({
                  ...template,
                  frontFields: template.frontFields.filter(
                    (fieldName) => fieldName !== 'FrontSide' && allowedFieldNames.has(fieldName)
                  ),
                  backFields: template.backFields.filter(
                    (fieldName) => fieldName === 'FrontSide' || allowedFieldNames.has(fieldName)
                  ),
                  rule: {
                    ...template.rule,
                    fields: [
                      ...template.rule.fields.filter((fieldName) =>
                        fields.some((field) => field.name === fieldName)
                      ),
                      ...fields
                        .filter(
                          (field) =>
                            !currentForm.fields.some(
                              (previousField) => previousField.name === field.name
                            )
                        )
                        .map((field) => field.name),
                    ],
                  },
                })),
              }));
            }}
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
            setModelTemplates={(templates) => {
              setForm((currentForm) => ({
                ...currentForm,
                templates,
              }));
            }}
          />
          {/*<ModelCssSection />*/}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
};
