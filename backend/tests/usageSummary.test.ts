import test from 'node:test';
import assert from 'node:assert/strict';

import { summarizeUsageByProvider } from '../services/usageService.js';

test('usage summary groups totals by provider and model', () => {
  const rows = [
    {
      metadata: {
        provider: 'groq',
        key_name: 'GROQ_API_KEY',
        model: 'llama-3.3-70b-versatile',
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
      },
    },
    {
      metadata: {
        provider: 'groq',
        key_name: 'GROQ_API_KEY',
        model: 'llama-3.3-70b-versatile',
        usage: { prompt_tokens: 50, completion_tokens: 150, total_tokens: 200 },
      },
    },
    {
      metadata: {
        provider: 'openai',
        key_name: 'OPENAI_API_KEY',
        model: 'gpt-4o-mini',
        usage: { prompt_tokens: 75, completion_tokens: 25, total_tokens: 100 },
      },
    },
  ];

  const summary = summarizeUsageByProvider(rows as any[]);

  assert.equal(summary.total_requests, 3);
  assert.equal(summary.total_tokens, 600);
  assert.equal(summary.by_provider.length, 2);

  const groq = summary.by_provider.find((item: any) => item.provider === 'groq');
  assert.ok(groq);
  assert.equal(groq.total_tokens, 500);
  assert.equal(groq.total_requests, 2);
  assert.equal(groq.models[0].model, 'llama-3.3-70b-versatile');
  assert.equal(groq.models[0].total_tokens, 500);

  const openai = summary.by_provider.find((item: any) => item.provider === 'openai');
  assert.ok(openai);
  assert.equal(openai.total_tokens, 100);
  assert.equal(openai.key_name, 'OPENAI_API_KEY');
});
