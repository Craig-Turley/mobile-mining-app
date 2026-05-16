import React, { PropsWithChildren } from 'react';
import { View, Text } from 'react-native';
import VideoPlayer from './components/video-player';
import { useVideoPlayerContext } from './contexts/video-screen-context';
import VideoLoader from './components/video-loader';
import SubtitleLoader from './components/subtitles-loader';
import SubtitlesPlayer from './components/subtitles-player';

interface ScreenContentProps extends PropsWithChildren {
}

export const VideoPlayerScreen: React.FC<ScreenContentProps> = ({ children }) => {
  const { playerLoaded, subtitlesLoaded } = useVideoPlayerContext();

  return (
    <View className="flex-1 bg-background">
      {!playerLoaded ? (
        <VideoLoader />
      ) : (
        <>
          <VideoPlayer />

          {subtitlesLoaded ? (
            <SubtitlesPlayer />
          ) : (
            <SubtitleLoader />
          )}
        </>
      )}
    </View>
  );

};
