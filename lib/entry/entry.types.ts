export type Entry = {
  id: number;
  dictionary: string;
  expression: string;
  reading: string;
  definition_tags: string | null;
  rules: string;
  score: number;
  sequence: number;
  term_tags: string;
  definitions_json: string;
};
