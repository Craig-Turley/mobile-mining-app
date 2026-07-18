import { Token } from '@kuzulabz/expo-kagome';

type PosTag = 'noun' | 'verb' | 'adj' | 'adv' | 'particle' | 'other';

export const getPosTag = (token: Token): PosTag => {
  const pos = token.pos?.[0];

  switch (pos) {
    case '名詞':
      return 'noun';
    case '動詞':
      return 'verb';
    case '形容詞':
      return 'adj';
    case '副詞':
      return 'adv';
    case '助詞':
      return 'particle';
    default:
      return 'other';
  }
};

export function katakanaToHiragana(input: string): string {
  return input.replace(/[\u30A1-\u30F6]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0x60)
  );
}
