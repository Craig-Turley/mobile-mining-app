import kuromoji from "kuromoji-react-native";
import { Asset } from "expo-asset";
import { File, Directory, Paths } from "expo-file-system";

export const kuromojiDictAssets: Record<string, number> = {
  "base.dat.gz": require("@/assets/kuromoji-dict/base.dat.gz"),
  "cc.dat.gz": require("@/assets/kuromoji-dict/cc.dat.gz"),
  "check.dat.gz": require("@/assets/kuromoji-dict/check.dat.gz"),
  "tid.dat.gz": require("@/assets/kuromoji-dict/tid.dat.gz"),
  "tid_map.dat.gz": require("@/assets/kuromoji-dict/tid_map.dat.gz"),
  "tid_pos.dat.gz": require("@/assets/kuromoji-dict/tid_pos.dat.gz"),
  "unk.dat.gz": require("@/assets/kuromoji-dict/unk.dat.gz"),
  "unk_char.dat.gz": require("@/assets/kuromoji-dict/unk_char.dat.gz"),
  "unk_compat.dat.gz": require("@/assets/kuromoji-dict/unk_compat.dat.gz"),
  "unk_invoke.dat.gz": require("@/assets/kuromoji-dict/unk_invoke.dat.gz"),
  "unk_map.dat.gz": require("@/assets/kuromoji-dict/unk_map.dat.gz"),
  "unk_pos.dat.gz": require("@/assets/kuromoji-dict/unk_pos.dat.gz"),
};

// Use cache because these files can be recreated from bundled assets.
// Use Paths.document instead if you want them to survive cache cleanup.
const DICT_DIR = new Directory(Paths.cache, "kuromoji-dict");

function ensureTrailingSlash(uri: string): string {
  return uri.endsWith("/") ? uri : `${uri}/`;
}

async function prepareKuromojiDictFolder(): Promise<string> {
  DICT_DIR.create({
    intermediates: true,
    idempotent: true,
  });

  for (const [filename, moduleId] of Object.entries(kuromojiDictAssets)) {
    const destination = new File(DICT_DIR, filename);

    if (destination.exists && destination.size && destination.size > 0) {
      continue;
    }

    if (destination.exists) {
      destination.delete();
    }

    const asset = Asset.fromModule(moduleId);
    await asset.downloadAsync();

    const sourceUri = asset.localUri ?? asset.uri;

    if (!sourceUri) {
      throw new Error(`Could not resolve Kuromoji asset: ${filename}`);
    }

    const source = new File(sourceUri);

    if (!source.exists || !source.size || source.size <= 0) {
      throw new Error(`Kuromoji asset was not downloaded correctly: ${filename}`);
    }

    source.copy(destination);
  }

  return ensureTrailingSlash(DICT_DIR.uri);
}

export type KuromojiToken = {
  surface: string;
  baseForm: string;
  reading?: string;
  pronunciation?: string;
  pos: string;
  posDetail1?: string;
};

let tokenizerPromise: Promise<any> | null = null;

export function getKuromojiTokenizer(): Promise<any> {
  if (!tokenizerPromise) {
    tokenizerPromise = (async () => {
      const dicPath = await prepareKuromojiDictFolder();

      console.log("Kuromoji dicPath:", dicPath);

      return new Promise((resolve, reject) => {
        kuromoji
          .builder({
            dicPath,
          })
          .build((error: Error | null, tokenizer: any) => {
            if (error) {
              tokenizerPromise = null;
              reject(error);
              return;
            }

            resolve(tokenizer);
          });
      });
    })();
  }

  return tokenizerPromise;
}

export async function tokenize(text: string): Promise<KuromojiToken[]> {
  const tokenizer = await getKuromojiTokenizer();
  const tokens = tokenizer.tokenize(text);

  return tokens.map((token: any) => ({
    surface: token.surface_form,
    baseForm:
      token.basic_form && token.basic_form !== "*"
        ? token.basic_form
        : token.surface_form,
    reading:
      token.reading && token.reading !== "*"
        ? token.reading
        : undefined,
    pronunciation:
      token.pronunciation && token.pronunciation !== "*"
        ? token.pronunciation
        : undefined,
    pos: token.pos,
    posDetail1:
      token.pos_detail_1 && token.pos_detail_1 !== "*"
        ? token.pos_detail_1
        : undefined,
  }));
}
