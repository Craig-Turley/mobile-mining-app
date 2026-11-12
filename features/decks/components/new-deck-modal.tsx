import {
  BottomSheetModal,
  BottomSheetModalProps,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetModal as BottomSheetModalType,
} from '@gorhom/bottom-sheet';
import { Pressable, Text, View } from 'react-native';
import { forwardRef, useRef } from 'react';
import { cssInterop } from 'nativewind';
import { useAppTheme } from '@/theme/theme-provider';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeckFormData } from '@/lib/anki-settings';
import { generateDeckId } from '@/lib/genanki';
import { useNewDeckModal } from '../contexts/new-deck-modal-context';
import { useMutation } from '@/db/hooks/use-mutation';
import { upsertDeckQuery } from '@/db/features/decks/decks.queries';
import { NOPMutationMapper } from '@/db/hooks/use-app-live-query';

interface NewDeckModalProps extends BottomSheetModalProps { }

cssInterop(BottomSheetScrollView, {
  className: 'style',
});

cssInterop(BottomSheetModal, {
  backgroundClassName: 'backgroundStyle',
  handleIndicatorClassName: 'handleIndicatorStyle',
});

cssInterop(BottomSheetTextInput, {
  className: 'style',
});

function newDeckForm() {
  return {
    id: generateDeckId(),
    name: '',
    description: '',
  };
}

export const NewDeckBottomSheetModal = forwardRef<
  BottomSheetModalType,
  Omit<NewDeckModalProps, 'children'>
>((_, ref) => {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const formRef = useRef<DeckFormData>(newDeckForm());

  const { close } = useNewDeckModal();
  const { mutate: saveDeck } = useMutation(upsertDeckQuery, NOPMutationMapper);

  const handleSubmit = () => {
    const form = formRef.current;

    saveDeck({
      deckFormData: form,
    });

    formRef.current = newDeckForm();
    close();
  };

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      enableDynamicSizing
      enablePanDownToClose
      maxDynamicContentSize={600}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={{
        backgroundColor: colors.surface,
      }}
    >
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 16 + insets.bottom,
          gap: 16,
        }}
      >
        <View className="mb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-primary">
              New deck
            </Text>

            <Text className="mt-1 text-lg font-semibold text-foreground">
              Configure deck
            </Text>
          </View>
        </View>

        <View className="gap-4">
          <View className="gap-3">
            <Text className="text-[10px] uppercase tracking-widest text-mutedForeground">
              Name
            </Text>

            <BottomSheetTextInput
              defaultValue=""
              onChangeText={(name) => {
                formRef.current.name = name;
              }}
              placeholder="e.g. Mining · Kanji"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="done"
              className="h-12 rounded-xl border border-border bg-background px-4 text-base text-foreground"
            />

            <Text className="text-[10px] text-mutedForeground">
              If you wish to import into a pre-existing deck, the name must
              match your Anki deck exactly.
            </Text>
          </View>

          <View className="gap-3">
            <Text className="text-[10px] uppercase tracking-widest text-mutedForeground">
              Description
            </Text>

            <BottomSheetTextInput
              defaultValue=""
              onChangeText={(description) => {
                formRef.current.description = description;
              }}
              placeholder="e.g. Main deck for..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              className="min-h-24 rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground"
              textAlignVertical="top"
            />
          </View>

          <Pressable
            className="h-11 flex-row items-center justify-center gap-2 rounded-xl bg-primary active:opacity-90"
            accessibilityRole="button"
            onPress={handleSubmit}
          >
            <Ionicons
              name="checkmark"
              size={18}
              color={colors.primaryForeground}
            />

            <Text className="text-sm font-semibold text-primary-foreground">
              Create deck
            </Text>
          </Pressable>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
