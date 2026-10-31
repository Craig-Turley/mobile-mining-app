const diagnostics = new Set<string>();

export function cssDiagnostic(message: string) {
  if (diagnostics.has(message)) return;
  diagnostics.add(message);
  console.warn(`[dictionary CSS] ${message}`);
}
