import { describe, expect, it } from 'vitest';
import { isAllowedEmail, parseAllowList } from './whitelist';

describe('isAllowedEmail', () => {
  it('returns true for exact match', () => {
    expect(
      isAllowedEmail('daichi.tomita@vivion.jp', ['daichi.tomita@vivion.jp']),
    ).toBe(true);
  });

  it('returns false for non-matching email', () => {
    expect(
      isAllowedEmail('other@example.com', ['daichi.tomita@vivion.jp']),
    ).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(
      isAllowedEmail('DAICHI.tomita@VIVION.JP', ['daichi.tomita@vivion.jp']),
    ).toBe(true);
  });

  it('trims whitespace in allow list entries', () => {
    expect(
      isAllowedEmail('foo@bar.com', [' foo@bar.com ', 'baz@bar.com']),
    ).toBe(true);
  });

  it('returns false for empty allow list', () => {
    expect(isAllowedEmail('foo@bar.com', [])).toBe(false);
  });

  it('returns false for empty email', () => {
    expect(isAllowedEmail('', ['foo@bar.com'])).toBe(false);
  });
});

describe('parseAllowList', () => {
  it('returns empty array for undefined', () => {
    expect(parseAllowList(undefined)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseAllowList('')).toEqual([]);
  });

  it('splits a single email', () => {
    expect(parseAllowList('foo@bar.com')).toEqual(['foo@bar.com']);
  });

  it('splits multiple emails and trims whitespace', () => {
    expect(parseAllowList(' foo@bar.com , baz@bar.com ')).toEqual([
      'foo@bar.com',
      'baz@bar.com',
    ]);
  });

  it('drops empty entries', () => {
    expect(parseAllowList('foo@bar.com,,baz@bar.com,')).toEqual([
      'foo@bar.com',
      'baz@bar.com',
    ]);
  });
});
