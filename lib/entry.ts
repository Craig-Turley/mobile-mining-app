// NOTE: this is the jitendex type just keeping here just incase I support in the future
// export type Entry = {
//   id: number
//   expression: string
//   reading: string
//   definition_tags: string
//   rules: string
//   score: number
//   sequence: number
//   term_tags: string
//   definitions_json: string
// }

export type Entry = {
  id: number
  kanji: JMdictKanji[]
  kana: JMdictKana[]
  sense: JMdictSense[]
}

export type DBEntry = {
  id: number
  kanji_json: string
  kana_json: string
  sense_json: string
}

export type Tag = string;
export type Xref = any;
export type JMdictGender = "masculine" | "feminine" | "neuter";
export type Language3Letter = string;
export type JMdictGlossType = "literal" | "figurative" | "explanation" | "trademark";
export type JMdictLanguageSource = {
  full: boolean;
  lang: Language3Letter;
  text: string | null;
  wasei: boolean;
}

export type JMdictKana = {
  appliesToKanji: string[];
  common: boolean;
  tags: Tag[];
  text: string;
}

export type JMdictKanji = {
  common: boolean;
  tags: Tag[];
  text: string;
}

export type JMdictSense = {
  antonym: Xref[];
  appliesToKana: string[];
  appliesToKanji: string[];
  dialect: Tag[];
  field: Tag[];
  gloss: JMdictGloss[];
  info: string[];
  languageSource: JMdictLanguageSource[];
  misc: Tag[];
  partOfSpeech: Tag[];
  related: Xref[];
}

export type JMdictGloss = {
  gender: JMdictGender | null;
  lang: Language3Letter;
  text: string;
  type: JMdictGlossType | null;
}

export const JITENDEX_GET_QUERY = `
  SELECT id, expression, reading, definition_tags, rules, score, sequence, term_tags, definitions_json 
  FROM entries
  WHERE expression = ? OR reading = ?
  LIMIT 25;
`;

export const JMDICT_GET_QUERY = `
  SELECT DISTINCT e.*
    FROM lookup l
  JOIN entries e
    ON e.id = l.entry_id
  WHERE(l.expression = ? AND l.reading = ?)
     OR l.expression = ?
    OR l.reading = ?
      ORDER BY
  CASE
      WHEN l.expression = ? AND l.reading = ? THEN 0
      WHEN l.expression = ? THEN 1
      WHEN l.reading = ? THEN 2
      ELSE 3
  END;
`
