import { PropsWithChildren, useEffect, useState } from 'react';
import { View, Text, LayoutChangeEvent, Pressable } from 'react-native';
import { secondsToTime, SubtitleCue } from '@/utils/subtitles';
import { cn } from '@/utils/cn';
import { getTokens, Token } from '@kuzulabz/expo-kagome';
import { getPosTag, katakanaToHiragana } from '@/utils/tokenizer';
import { useVideoPlayerContext } from '../contexts/video-screen-context';
import { useEntryModal } from '../contexts/entry-modal-context';

export interface SubtitleProps extends PropsWithChildren {
  cue: SubtitleCue;
  active?: boolean;
  onLayout?: (event: LayoutChangeEvent) => void;
}

export default function Subtitle({ cue, active, onLayout }: SubtitleProps) {
  const { setTimeStamp } = useVideoPlayerContext();
  const [tokens, setTokens] = useState<Token[]>([]);
  const { setToken } = useEntryModal();

  // NOTE: the flatlist that holds these components takes care of the rendering when
  // it needs to be mounted so we're not hammering the cpu with unnessarcy tokenize calls
  // (i think)
  useEffect(() => {
    tokenize();
  }, []);

  // TODO: handle error case of unparsable subtitles
  const tokenize = async () => {
    const tokenList = await getTokens(cue.text);
    if (tokenList == null) {
      console.log(`error parsing cue with id ${cue.id}`);
      return;
    }

    const cleaned = tokenList
      .filter((t) => t.surface_form.trim().length > 0) // drop whitespace-only tokens
      .map((t) => ({ ...t, reading: katakanaToHiragana(t.reading) }));
    setTokens(cleaned);
  };

  const renderToken = (token: Token, index: number) => (
    <Text key={index} className={`${getTokenColor(token)}`} onPress={() => setToken(token)}>
      {token.surface_form}
    </Text>
  );

  const getTokenColor = (token: Token): string => {
    switch (getPosTag(token)) {
      case 'noun':
        return 'text-posNoun';
      case 'verb':
        return 'text-posVerb';
      case 'adj':
        return 'text-posAdj';
      case 'adv':
      case 'particle':
      case 'other':
    }

    return '';
  };

  return (
    <Pressable onPress={() => setTimeStamp(cue.start)}>
      <View
        className={cn(
          'my-3 w-full gap-1 rounded-lg border-4 border-solid border-muted p-2 py-4',
          active ? 'border-primary' : ''
        )}
        onLayout={onLayout}>
        <Text className="text-primary">
          {secondsToTime(cue.start)} - {secondsToTime(cue.end)}
        </Text>
        <Text className="flex-row flex-wrap text-2xl text-foreground">
          {tokens != null ? tokens.map(renderToken) : cue.text}
        </Text>
      </View>
    </Pressable>
  );
}
