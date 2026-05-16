import { VideoView } from 'expo-video';
import { cssInterop } from 'nativewind';
import { View } from 'react-native';
import { useVideoPlayerContext } from '../contexts/video-screen-context';

cssInterop(VideoView, {
  className: "style",
});

export default function VideoPlayer() {
  const { player } = useVideoPlayerContext();

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
