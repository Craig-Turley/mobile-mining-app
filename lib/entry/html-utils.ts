export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/gu,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]!
  );
}

export function exportKey(value: string | Uint8Array): string {
  let hash = 0x6c62272e07bb014262b821756295c58dn;
  for (let i = 0; i < value.length; i++) {
    hash ^= BigInt(typeof value === 'string' ? value.charCodeAt(i) : value[i]);
    hash = (hash * 0x1000000000000000000013bn) & ((1n << 128n) - 1n);
  }
  return hash.toString(16).padStart(32, '0');
}

export type GlossaryAssetSource = 'dictionary' | 'transformed';
export type ResolveGlossaryAsset = (path: string, source?: GlossaryAssetSource) => Promise<string>;
