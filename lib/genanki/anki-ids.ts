export function generateModelId(): number {
  return (1 << 30) + Math.floor(Math.random() * (1 << 30));
}

export function generateDeckId(): number {
  return (1 << 30) + Math.floor(Math.random() * (1 << 30));
}
