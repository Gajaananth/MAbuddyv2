import React, { useEffect, useState } from 'react';
import api from '../services/api';

interface ProviderUsageRow {
  provider: string;
  key_name: string;
  total_requests: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  models: Array<{
    model: string;
    requests: number;
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
  }>;
}

const UsageDashboard: React.FC = () => {
  const [summary, setSummary] = useState<{ total_requests: number; total_tokens: number; by_provider: ProviderUsageRow[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/usage/summary?days=30');
        if (res.data?.success) {
          setSummary(res.data.data);
        } else {
          setError(res.data?.error || 'Failed to load usage');
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load usage');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) return <div className="p-4 text-white">Loading model usage…</div>;
  if (error) return <div className="p-4 text-red-400">{error}</div>;

  return (
    <div className="rounded-2xl border border-red-500/20 bg-black/20 p-4 text-white">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold uppercase tracking-wide">Model Usage</h3>
        <div className="text-sm text-red-300">{summary?.total_requests || 0} requests</div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs uppercase tracking-wide text-red-300">Total tokens</div>
          <div className="mt-2 text-2xl font-black">{summary?.total_tokens || 0}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs uppercase tracking-wide text-red-300">Prompt</div>
          <div className="mt-2 text-2xl font-black">{summary?.by_provider.reduce((sum, row) => sum + row.prompt_tokens, 0) || 0}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs uppercase tracking-wide text-red-300">Completion</div>
          <div className="mt-2 text-2xl font-black">{summary?.by_provider.reduce((sum, row) => sum + row.completion_tokens, 0) || 0}</div>
        </div>
      </div>

      <div className="space-y-4">
        {(summary?.by_provider || []).map((provider) => (
          <div key={provider.provider} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold uppercase tracking-wide text-red-300">{provider.provider}</div>
                <div className="text-xs text-slate-300">{provider.key_name}</div>
              </div>
              <div className="text-right text-xs text-slate-300">
                <div>{provider.total_requests} requests</div>
                <div>{provider.total_tokens} tokens</div>
              </div>
            </div>

            <div className="mt-2 space-y-2">
              {(provider.models || []).map((model) => (
                <div key={`${provider.provider}-${model.model}`} className="rounded-lg border border-white/5 bg-black/20 p-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-white">{model.model}</span>
                    <span className="text-red-300">{model.total_tokens} tokens</span>
                  </div>
                  <div className="mt-1 flex gap-3 text-[11px] text-slate-300">
                    <span>Prompt: {model.prompt_tokens}</span>
                    <span>Completion: {model.completion_tokens}</span>
                    <span>Calls: {model.requests}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UsageDashboard;
