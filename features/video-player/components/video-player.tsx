import { useVideoPlayer, VideoView } from 'expo-video';
import { cssInterop } from 'nativewind';
import { View } from 'react-native';
import { useVideoPlayerContext } from '../contexts/video-screen-context';
import { useEventListener } from 'expo';

cssInterop(VideoView, {
  className: "style",
});

export default function VideoPlayer() {
  const { videoUri, setTimeStamp } = useVideoPlayerContext();

  const player = useVideoPlayer(videoUri, player => {
    player.timeUpdateEventInterval = 0.25;
    player.loop = true;
    player.play();
  });

  useEventListener(player, "timeUpdate", ({ currentTime }) => {
    setTimeStamp(currentTime);
    console.log("Hello");
  });

  return (
    <View>
      <VideoView
        className="w-full aspect-video"
        player={player}
        fullscreenOptions={{ enable: true }}
        allowsPictureInPicture
      />
    </View>
  );
}
