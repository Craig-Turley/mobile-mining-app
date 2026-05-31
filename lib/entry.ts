export type Entry = {
  id: number
  expression: string
  reading: string
  definition_tags: string
  rules: string
  score: number
  sequence: number
  term_tags: string
  definitions_json: string
}

export const JITENDEX_GET_QUERY = `
  SELECT id, expression, reading, definition_tags, rules, score, sequence, term_tags, definitions_json 
  FROM entries
  WHERE expression = ? OR reading = ?
  LIMIT 25;
`;
