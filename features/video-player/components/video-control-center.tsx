import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import { View, ViewProps } from "react-native";
import { useVideoPlayerContext } from "../contexts/video-screen-context";
import { useSubtitlePlayerContext } from "../contexts/subtitles-context";

export interface VideoPlayerControlCenterProps extends ViewProps {
  previousSubtitle: () => void;
  replayCurrentSubtitle: () => void;
  toggle: () => void;
  nextSubtitle: () => void;
}

type ControlButtonProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress?: () => void;
  variant?: "plain" | "outline" | "primary";
  iconClassName?: string;
};

const ControlButton = ({
  icon,
  onPress,
  variant = "plain",
  iconClassName,
}: ControlButtonProps) => {
  const variants = {
    plain: {
      button: "",
      icon: "text-foreground",
    },
    outline: {
      button: "border border-primary bg-surfaceElevated",
      icon: "text-primary",
    },
    primary: {
      button: "bg-primary",
      icon: "text-foreground",
    },
  };

  const styles = variants[variant];

  return (
    <TouchableOpacity
      className={`p-5 items-center justify-center rounded-full ${styles.button}`}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={28}
        className={iconClassName ?? styles.icon}
      />
    </TouchableOpacity>
  );
};

export default function VideoPlayerControlCenter() {
  const { playing, play, pause } = useVideoPlayerContext();
  const { previousSubtitle, replayCurrentSubtitle, nextSubtitle } = useSubtitlePlayerContext();

  return (
    <View className="w-full flex-row items-center justify-evenly p-2">
      <ControlButton
        icon="close-outline"
        onPress={router.back}
      />

      <ControlButton
        icon="play-skip-back-outline"
        onPress={previousSubtitle}
      />

      <ControlButton
        icon="reload"
        variant="outline"
        onPress={replayCurrentSubtitle}
      />

      <ControlButton
        icon={playing ? "pause" : "play"}
        variant="primary"
        onPress={playing ? pause : play}
      />

      <ControlButton
        icon="play-skip-forward-outline"
        onPress={nextSubtitle}
      />
    </View>
  );
}
