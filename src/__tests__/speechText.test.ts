import { describe, it, expect } from 'vitest';
import { chunkSpeechText, cleanSpeechText } from '@/lib/speechText';

describe('voice speech preparation', () => {
  it('preserves all Arabic text in ordered bounded chunks', () => {
    const text = 'هذه جملة طويلة عن طلب الصيانة. '.repeat(180);
    const chunks = chunkSpeechText(text);
    expect(chunks.join('')).toBe(text);
    expect(chunks.every(chunk => Array.from(chunk).length <= 1200)).toBe(true);
  });
  it('splits unbroken input without truncation', () => {
    const text = 'ص'.repeat(3500);
    expect(chunkSpeechText(text).join('')).toBe(text);
    expect(chunkSpeechText(text)).toHaveLength(3);
  });
  it('cleans links and formatting while preserving names and punctuation', () => {
    expect(cleanSpeechText('**طلبك** [هنا](https://example.com)\nUF-123!')).toBe('طلبك هنا. UF-123!');
  });
  it('rejects an invalid budget and skips empty input', () => {
    expect(() => chunkSpeechText('طلب', 0)).toThrow();
    expect(chunkSpeechText('')).toEqual([]);
  });
});