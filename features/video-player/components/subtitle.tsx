import { PropsWithChildren } from "react";
import { View, Text, LayoutChangeEvent } from "react-native";
import { SubtitleCue } from "@/utils/subtitles";

export interface SubtitleProps extends PropsWithChildren {
  cue: SubtitleCue;
  onLayout?: (event: LayoutChangeEvent) => void;
}

export default function Subtitle({ cue, onLayout }: SubtitleProps) {
  return (
    <View
      className="p-2 py-4 my-3 border-black border-4 border-solid rounded w-full"
      onLayout={onLayout}
    >
      <Text>{cue.text}</Text>
    </View>
  );
}
