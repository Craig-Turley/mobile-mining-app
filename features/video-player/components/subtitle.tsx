import { PropsWithChildren } from "react";
import { View, Text, LayoutChangeEvent } from "react-native";
import { secondsToTime, SubtitleCue } from "@/utils/subtitles";
import { cn } from "@/utils/cn";
import { getTokens } from "@kuzulabz/expo-kagome";

export interface SubtitleProps extends PropsWithChildren {
  cue: SubtitleCue;
  active?: boolean
  onLayout?: (event: LayoutChangeEvent) => void;
}

export default function Subtitle({ cue, active, onLayout }: SubtitleProps) {
  const tokenize = async () => {
    const tokens = await getTokens(cue.text);
    console.log(tokens[0]);
  };

  if (active) {
    console.log("getting tokens...");
    tokenize();
  }

  return (
    <View
      className={cn(
        "bg-surface rounded-lg p-2 py-4 my-3 border-muted border-4 border-solid w-full",
        active ? "border-primary" : ""
      )}
      onLayout={onLayout}
    >
      <Text className="text-primary">
        {secondsToTime(cue.start)} - {secondsToTime(cue.end)}
      </Text>
      <Text
        className="text-foreground text-2xl"
      >
        {cue.text}
      </Text>
    </View>
  );
}
