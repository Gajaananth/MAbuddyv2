import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeModelForProvider, getProviderForModel } from '../services/openClawService.js';

test('provider routing normalizes Groq and Gemini to supported live models', () => {
  assert.equal(normalizeModelForProvider('groq', 'meta/llama-3.1-70b-instruct'), 'llama-3.3-70b-versatile');
  assert.equal(normalizeModelForProvider('gemini', 'gemini-2.0-flash-lite-preview-02-05'), 'gemini-2.0-flash');
  assert.equal(normalizeModelForProvider('nvidia', 'llama-3.3-70b-versatile'), 'meta/llama-3.1-70b-instruct');
});

test('provider detection respects canonical provider names', () => {
  assert.equal(getProviderForModel('gemini-2.0-flash'), 'gemini');
  assert.equal(getProviderForModel('llama-3.3-70b-versatile'), 'groq');
  assert.equal(getProviderForModel('meta/llama-3.1-70b-instruct'), 'nvidia');
});
