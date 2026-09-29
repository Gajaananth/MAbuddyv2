import db from '../db/connection.js';

export interface UsageRow {
  metadata?: {
    provider?: string;
    key_name?: string;
    model?: string;
    usage?: {
      prompt_tokens?: number | string;
      completion_tokens?: number | string;
      total_tokens?: number | string;
    };
  };
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

export function summarizeUsageByProvider(rows: UsageRow[]) {
  const providerMap = new Map<string, {
    provider: string;
    key_name: string;
    total_requests: number;
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
    models: Map<string, {
      model: string;
      requests: number;
      total_tokens: number;
      prompt_tokens: number;
      completion_tokens: number;
    }>;
  }>();

  for (const row of rows) {
    const metadata = row.metadata || {};
    const provider = (metadata.provider || 'unknown').toLowerCase();
    const keyName = metadata.key_name || `${provider.toUpperCase()}_API_KEY`;
    const model = metadata.model || 'unknown-model';
    const usage = metadata.usage || {};

    const promptTokens = toNumber(usage.prompt_tokens);
    const completionTokens = toNumber(usage.completion_tokens);
    const totalTokens = toNumber(usage.total_tokens) || promptTokens + completionTokens;

    if (!providerMap.has(provider)) {
      providerMap.set(provider, {
        provider,
        key_name: keyName,
        total_requests: 0,
        total_tokens: 0,
        prompt_tokens: 0,
        completion_tokens: 0,
        models: new Map(),
      });
    }

    const providerEntry = providerMap.get(provider)!;
    providerEntry.total_requests += 1;
    providerEntry.total_tokens += totalTokens;
    providerEntry.prompt_tokens += promptTokens;
    providerEntry.completion_tokens += completionTokens;

    if (!providerEntry.models.has(model)) {
      providerEntry.models.set(model, {
        model,
        requests: 0,
        total_tokens: 0,
        prompt_tokens: 0,
        completion_tokens: 0,
      });
    }

    const modelEntry = providerEntry.models.get(model)!;
    modelEntry.requests += 1;
    modelEntry.total_tokens += totalTokens;
    modelEntry.prompt_tokens += promptTokens;
    modelEntry.completion_tokens += completionTokens;
  }

  const byProvider = Array.from(providerMap.values()).map((entry) => ({
    provider: entry.provider,
    key_name: entry.key_name,
    total_requests: entry.total_requests,
    total_tokens: entry.total_tokens,
    prompt_tokens: entry.prompt_tokens,
    completion_tokens: entry.completion_tokens,
    models: Array.from(entry.models.values()).map((modelEntry) => ({
      model: modelEntry.model,
      requests: modelEntry.requests,
      total_tokens: modelEntry.total_tokens,
      prompt_tokens: modelEntry.prompt_tokens,
      completion_tokens: modelEntry.completion_tokens,
    })).sort((a, b) => b.total_tokens - a.total_tokens),
  })).sort((a, b) => b.total_tokens - a.total_tokens);

  return {
    total_requests: rows.length,
    total_tokens: byProvider.reduce((sum, entry) => sum + entry.total_tokens, 0),
    by_provider: byProvider,
  };
}

export async function getUsageSummaryForUser(userId: string, days: number = 30) {
  const pool = db.pool;
  let providerStatus: Record<string, any> = {};
  try {
    const { getProviderStatus } = await import('./openClawService.js');
    providerStatus = getProviderStatus();
  } catch {}

  if (!pool) {
    return {
      total_requests: 0,
      total_tokens: 0,
      by_provider: [],
      recent_calls: [],
      provider_status: providerStatus,
      window_days: days,
    };
  }

  const result = await pool.query(
    `
      SELECT m.id, m.created_at, m.metadata, c.title as conversation_title
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE c.user_id = $1
        AND m.role = 'nova'
        AND m.metadata IS NOT NULL
        AND m.created_at >= NOW() - ($2::int * INTERVAL '1 day')
      ORDER BY m.created_at DESC
    `,
    [userId, days]
  );

  const rows = result.rows.map((row: any) => ({ metadata: row.metadata || {} }));
  const summary = summarizeUsageByProvider(rows);

  const recentCalls = result.rows.slice(0, 40).map((r: any) => {
    let meta = r.metadata;
    if (typeof meta === 'string') {
      try { meta = JSON.parse(meta); } catch {}
    }
    return {
      id: r.id,
      created_at: r.created_at,
      conversation_title: r.conversation_title,
      provider: meta?.provider || 'unknown',
      model: meta?.model || 'auto',
      fallback: meta?.fallback || false,
      usage: meta?.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      key_name: meta?.key_name || `${(meta?.provider || 'LLM').toUpperCase()}_API_KEY`
    };
  });

  return {
    ...summary,
    recent_calls: recentCalls,
    provider_status: providerStatus,
    window_days: days,
  };
}
