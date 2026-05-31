import {
  BottomSheetModal,
  BottomSheetModalProps,
  BottomSheetView,
  type BottomSheetModal as BottomSheetModalType,
} from "@gorhom/bottom-sheet";
import { Token } from "@kuzulabz/expo-kagome";
import { Text } from "react-native";
import { forwardRef, useMemo } from "react";
import { cssInterop } from "nativewind";
import { darkColors, lightColors } from "@/theme/colors";
import { useAppTheme } from "@/theme/theme-provider";

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
    const snapPoints = useMemo(() => ["30%", "75%"], []);

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
          {token ? (
            <Text className="text-foreground text-5xl">
              {token.surface_form}
            </Text>
          ) : (
            <Text>No token selected.</Text>
          )}
        </BottomSheetView>
      </BottomSheetModal >
    );
  }
);
