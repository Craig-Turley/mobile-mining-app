export type ComponentName =
  | 'View'
  | 'Text'
  | 'Ruby'
  | 'RubyText'
  | 'RubyFallback'
  | 'List'
  | 'ListItem'
  | 'Table'
  | 'TableSection'
  | 'TableRow'
  | 'TableCell'
  | 'Link'
  | 'DictionaryImage'
  | 'Details'
  | 'Summary'
  | 'LineBreak';

export type StoredDefinition =
  | { type: 'content'; children: ComponentNode[] }
  | { type: 'deinflection'; term: string; rules: string[] };

export interface ComponentNode {
  component: ComponentName;
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
