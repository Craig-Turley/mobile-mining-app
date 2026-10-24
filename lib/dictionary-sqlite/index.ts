interface Entry {
  term: string;
  reading: string;
  definitionTags: string | null;
  rules: string;
  score: number;
  definitions: Definition[];
  sequence: number;
  termTags: string;
}

type Definition =
  | { type: 'content'; children: ComponentNode[] }
  | { type: 'deinflection'; term: string; rules: string[] };

interface ComponentNode {
  component: string;
  props: Record<string, unknown>;
  children: (ComponentNode | string)[];
  source?: {
    tag: string;
    data?: Record<string, string>;
    lang?: string;
    title?: string;
    style?: Record<string, unknown>;
  };
}
