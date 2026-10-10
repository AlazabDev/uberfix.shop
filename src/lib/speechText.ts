/** Keep every sentence while respecting the existing speech endpoint's input budget. */
export function chunkSpeechText(text: string, budget = 1200): string[] {
  if (!Number.isInteger(budget) || budget < 1) throw new Error('Invalid chunk budget');
  const chunks: string[] = [];
  let current = '';
  for (const sentence of text.match(/[^.!?؟。！？]+[.!?؟。！？]*\s*|[.!?؟。！？]+\s*/gu) ?? []) {
    const points = Array.from(sentence);
    if (Array.from(current).length + points.length <= budget) {
      current += sentence;
      continue;
    }
    if (current) chunks.push(current);
    current = '';
    for (let offset = 0; offset < points.length; offset += budget) {
      const part = points.slice(offset, offset + budget).join('');
      if (offset + budget < points.length) chunks.push(part);
      else current = part;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function cleanSpeechText(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#*_~`>|[\]()]/g, '').replace(/\n+/g, '. ').trim();
}