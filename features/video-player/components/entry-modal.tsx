import {
  BottomSheetModal,
  BottomSheetModalProps,
  BottomSheetView,
  type BottomSheetModal as BottomSheetModalType,
} from "@gorhom/bottom-sheet";
import { Token } from "@kuzulabz/expo-kagome";
import { Text, View } from "react-native";
import { forwardRef, useMemo } from "react";
import { cssInterop } from "nativewind";
import { darkColors, lightColors } from "@/theme/colors";
import { useAppTheme } from "@/theme/theme-provider";
import { useLookup } from "../hooks/use-lookup";
import { CarouselContainer, CarouselContent, CarouselHeader, CarouselNext, CarouselPrevious } from "@/components/carasoul";
import { Entry } from "@/lib/entry";

interface EntryModalProps extends BottomSheetModalProps {
  token: Token | null;
}

cssInterop(BottomSheetView, {
  className: "style",
});

cssInterop(BottomSheetModal, {
  backgroundClassName: "backgroundStyle",
  handleIndicatorClassName: "handleIndicatorStyle",
});

export const EntryBottomSheetModal = forwardRef<BottomSheetModalType, Omit<EntryModalProps, "children">>(
  ({ token, ...props }, ref) => {
    const { entries, isLoading, isError } = useLookup(token!);
    const snapPoints = useMemo(() => ["30%", "75%"], []);

    console.log(entries && entries[0].kanji, isLoading, isError);

    const bgColor =
      useAppTheme().theme === "light"
        ? lightColors.surface
        : darkColors.surface;

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        backgroundStyle={{
          backgroundColor: bgColor,
        }}
        {...props}
      >
        <BottomSheetView className="p-4">
          {token && !isLoading && entries != null ? (
            <CarouselContainer
              data={entries}
              className="w-full"
              render={(e: Entry, i: number) => (
                <View>
                  <Text className="text-white">{e.id}</Text>
                </View>
              )}
            >
              {entries.length > 1 &&
                <View className="w-full justify-between align-center flex-row">
                  <CarouselPrevious />
                  <CarouselHeader />
                  <CarouselNext />
                </View>
              }
              <CarouselContent />
            </CarouselContainer>
          ) : (
            <Text>No token selected.</Text>
          )}
        </BottomSheetView>
      </BottomSheetModal >
    );
  }
);
