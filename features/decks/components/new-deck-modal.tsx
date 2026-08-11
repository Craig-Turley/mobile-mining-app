import {
  BottomSheetModal,
  BottomSheetModalProps,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetModal as BottomSheetModalType,
} from '@gorhom/bottom-sheet';
import { Pressable, Text, View } from 'react-native';
import { forwardRef, useState } from 'react';
import { cssInterop } from 'nativewind';
import { darkColors, lightColors } from '@/theme/colors';
import { useAppTheme } from '@/theme/theme-provider';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeckFormData } from '@/lib/anki-settings';
import { generateDeckId } from '@/lib/genanki';
import { useNewDeckModal } from '../contexts/new-deck-modal-context';
import { useMutation } from '@/db/hooks/use-mutation';
import { upsertDeckQuery } from '@/db/features/decks/decks.queries';
import { NOPMutationMapper } from '@/db/hooks/use-app-live-query';
import { formDataToDeck } from '@/lib/anki-settings';

interface NewDeckModalProps extends BottomSheetModalProps { }

cssInterop(BottomSheetScrollView, {
  className: 'style',
});

cssInterop(BottomSheetModal, {
  backgroundClassName: 'backgroundStyle',
  handleIndicatorClassName: 'handleIndicatorStyle',
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
>((props, ref) => {
  const bgColor = useAppTheme().theme === 'light' ? lightColors.surface : darkColors.surface;

  const insets = useSafeAreaInsets();

  const [form, setForm] = useState<DeckFormData>(newDeckForm());
  const { close } = useNewDeckModal();

  const { mutate: saveDeck } = useMutation(upsertDeckQuery, NOPMutationMapper);

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
        backgroundColor: bgColor,
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
            <Text className="uppercase tracking-[3px] text-primary">New deck</Text>

            <Text className="mt-1 text-lg font-semibold text-foreground">Configure deck</Text>
          </View>

          {/*
          <Pressable
            className="rounded-full p-2 active:bg-accent"
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => {
              if (
                typeof ref !== "function" &&
                ref?.current
              ) {
                ref.current.dismiss();
              }
            }}
          >
            <Ionicons
              name="close"
              size={18}
              className="text-mutedForeground"
            />
          </Pressable>
          */}
        </View>

        <View className="gap-4">
          <View className="gap-3">
            <Text className="text-[10px] uppercase tracking-widest text-mutedForeground">Name</Text>

            <BottomSheetTextInput
              value={form.name}
              onChangeText={(text) =>
                setForm((prev) => ({
                  ...prev,
                  name: text,
                }))
              }
              placeholder="e.g. Mining · Kanji"
              placeholderTextColor="#888"
              className="p-3 rounded-lg border border-border bg-surface text-lg text-foreground"
              returnKeyType="done"
            />

            <Text className="text-[10px] text-mutedForeground">
              If you wish to import into a pre-existing deck, the name must match your Anki deck
              exactlty
            </Text>
          </View>

          <View className="gap-3">
            <Text className="text-[10px] uppercase tracking-widest text-mutedForeground">
              Description
            </Text>

            <BottomSheetTextInput
              value={form.description}
              onChangeText={(text) =>
                setForm((prev) => ({
                  ...prev,
                  description: text,
                }))
              }
              placeholder="e.g. Main deck for..."
              placeholderTextColor="#888"
              className="p-3 rounded-lg border border-border bg-surface text-lg text-foreground"
              multiline
            />
          </View>

          <View className="gap-3">
            {/*
            <Text className="text-[10px] uppercase tracking-widest text-mutedForeground">
              Parent deck
            </Text>

            <View className="flex-row flex-wrap gap-1.5">
              {["", ...decks.map(deck => deck.name)].map(parent => {
                const selected = newParent === parent;

                return (
                  <Pressable
                    key={parent || "root"}
                    className={
                      selected
                        ? "rounded-full border border-primary bg-primary/15 px-2.5 py-1"
                        : "rounded-full border border-border px-2.5 py-1"
                    }
                  >
                    <Text
                      className={
                        selected
                          ? "text-sm text-primary"
                          : "text-sm text-mutedForeground"
                      }
                    >
                      {parent || "— None —"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            */}
          </View>

          <Pressable
            className="h-11 flex-row items-center justify-center gap-2 rounded-xl bg-primary active:opacity-90"
            accessibilityRole="button"
            onPress={async () => {
              saveDeck({
                deckFormData: form,
                deck: formDataToDeck(form),
              });

              setForm(newDeckForm());
              close();
            }}>
            <Ionicons name="checkmark" size={18} className="text-primary-foreground" />

            <Text className="text-primary-foreground text-sm font-semibold">Create deck</Text>
          </Pressable>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
