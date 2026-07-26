import { useAppTheme } from "@/theme/theme-provider";
import React, { forwardRef } from "react";
import {
  StyleSheet,
  TextInput as RNTextInput,
  type TextInputProps,
} from "react-native";

type Props = TextInputProps;

export const TextInput = forwardRef<RNTextInput, Props>(
  (
    {
      style,
      multiline = false,
      placeholderTextColor,
      ...props
    },
    ref,
  ) => {
    const { colors } = useAppTheme();

    return (
      <RNTextInput
        ref={ref}
        {...props}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        placeholderTextColor={
          placeholderTextColor ?? colors.mutedForeground
        }
        style={[
          styles.input,
          {
            color: colors.foreground,
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
          multiline && styles.multiline,
          style,
        ]}
      />
    );
  },
);

TextInput.displayName = "TextInput";

const styles = StyleSheet.create({
  input: {
    height: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,

    paddingHorizontal: 16,
    paddingVertical: 0,

    fontSize: 16,
    lineHeight: 20,

    textAlignVertical: "center",
  },

  multiline: {
    height: undefined,
    minHeight: 96,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: "top",
  },
});
