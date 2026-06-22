import { afterEach, describe, expect, it } from 'vitest';
import {
  assertScriptMutationsAllowed,
  extractSupabaseProjectRef,
} from './script-env-guard';

const ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'BROADBASE_PROD_SUPABASE_PROJECT_REF',
  'BROADBASE_SCRIPT_OVERRIDE_PROD',
] as const;

function saveEnv(): Record<string, string | undefined> {
  const saved: Record<string, string | undefined> = {};
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
  }
  return saved;
}

function restoreEnv(saved: Record<string, string | undefined>): void {
  for (const key of ENV_KEYS) {
    const value = saved[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe('extractSupabaseProjectRef', () => {
  it('parses standard project URLs', () => {
    expect(
      extractSupabaseProjectRef('https://abcdefghijklmnop.supabase.co')
    ).toBe('abcdefghijklmnop');
  });
});

describe('assertScriptMutationsAllowed', () => {
  let saved: Record<string, string | undefined>;

  afterEach(() => {
    restoreEnv(saved);
  });

  it('allows dev project when prod ref is configured', () => {
    saved = saveEnv();
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      'https://dev-project-ref.supabase.co';
    process.env.BROADBASE_PROD_SUPABASE_PROJECT_REF = 'prod-project-ref';

    expect(() => assertScriptMutationsAllowed()).not.toThrow();
  });

  it('blocks prod project without override', () => {
    saved = saveEnv();
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      'https://prod-project-ref.supabase.co';
    process.env.BROADBASE_PROD_SUPABASE_PROJECT_REF = 'prod-project-ref';

    expect(() => assertScriptMutationsAllowed()).toThrow(/Refusing to run/);
  });

  it('allows prod project with matching override', () => {
    saved = saveEnv();
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      'https://prod-project-ref.supabase.co';
    process.env.BROADBASE_PROD_SUPABASE_PROJECT_REF = 'prod-project-ref';
    process.env.BROADBASE_SCRIPT_OVERRIDE_PROD = 'prod-project-ref';

    expect(() => assertScriptMutationsAllowed()).not.toThrow();
  });
});
