export default function findField<T>(obj: unknown, targetKey: string): T | null {
  if (obj === null || typeof obj !== 'object') {
    return null;
  }

  const record = obj as Record<string, unknown>;

  if (targetKey in record) {
    return record[targetKey] as T;
  }

  for (const value of Object.values(record)) {
    if (value !== null && typeof value === 'object') {
      const result = findField<T>(value, targetKey);

      if (result !== null) {
        return result;
      }
    }
  }

  return null;
}
