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

    const bgColor =
      useAppTheme().theme === "light"
        ? lightColors.surface
        : darkColors.surface;

    const e = entries != null && entries?.length > 0 ? entries[0] : null;

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
          {isLoading ? (
            <Text className="text-foreground">Loading...</Text>
          ) : token && entries != null && e != null ? (
            <View className="flex-1 gap-2">
              <View className="w-full flex-1 flex-row gap-2 items-end">
                <Text className="text-4xl text-foreground">
                  {token.base_form}
                </Text>

                <Text className="text-2xl text-mutedForeground">
                  {e.kana[0].text}
                </Text>
              </View>

              <View className="flex-row gap-2 items-start">
                <Text className="text-foreground font-semibold">•</Text>

                <Text className="text-foreground font-semibold flex-1">
                  {e.sense[0].gloss.flatMap(s => s.text).join(", ")}
                </Text>
              </View>
            </View>
          ) : (
            <Text className="text-foreground">No token selected.</Text>
          )}
        </BottomSheetView>
      </BottomSheetModal >
    );
  }
);
