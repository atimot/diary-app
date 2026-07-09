import { describe, expect, it } from 'vitest';
import { diaryEntrySchema } from './diary';

describe('diaryEntrySchema', () => {
  it('accepts a valid entry', () => {
    const result = diaryEntrySchema.safeParse({
      entryDate: '2026-06-10',
      content: 'Hello world',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a date without zero-padding', () => {
    const result = diaryEntrySchema.safeParse({
      entryDate: '2026-6-10',
      content: 'Hello',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-existent calendar date', () => {
    const result = diaryEntrySchema.safeParse({
      entryDate: '2025-02-30',
      content: 'Hello',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a leap-year Feb 29', () => {
    const result = diaryEntrySchema.safeParse({
      entryDate: '2024-02-29',
      content: 'Hello',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty content', () => {
    const result = diaryEntrySchema.safeParse({
      entryDate: '2026-06-10',
      content: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects content over 50,000 characters', () => {
    const result = diaryEntrySchema.safeParse({
      entryDate: '2026-06-10',
      content: 'a'.repeat(50001),
    });
    expect(result.success).toBe(false);
  });

  it('accepts content of exactly 50,000 characters', () => {
    const result = diaryEntrySchema.safeParse({
      entryDate: '2026-06-10',
      content: 'a'.repeat(50000),
    });
    expect(result.success).toBe(true);
  });
});
