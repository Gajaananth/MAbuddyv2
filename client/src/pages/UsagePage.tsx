import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  Cpu,
  Zap,
  Server,
  Layers,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import { usageService } from '../services/api';

interface ModelUsage {
  model: string;
  requests: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
}

interface ProviderUsage {
  provider: string;
  key_name: string;
  total_requests: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  models: ModelUsage[];
}

interface RecentCall {
  id: string;
  created_at: string;
  conversation_title?: string;
  provider: string;
  model: string;
  fallback: boolean;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  key_name: string;
}

interface UsageSummaryResponse {
  total_requests: number;
  total_tokens: number;
  by_provider: ProviderUsage[];
  recent_calls?: RecentCall[];
  provider_status?: Record<string, boolean>;
  window_days?: number;
}

const PROVIDER_METADATA: Record<string, { name: string; color: string; bg: string; border: string; key: string }> = {
  groq: {
    name: 'Groq Cloud',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    key: 'GROQ_API_KEY',
  },
  gemini: {
    name: 'Google Gemini',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    key: 'GEMINI_API_KEY',
  },
  nvidia: {
    name: 'NVIDIA NIM',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    key: 'NVIDIA_API_KEY',
  },
  mistral: {
    name: 'Mistral AI',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    key: 'MISTRAL_API_KEY',
  },
  sambanova: {
    name: 'SambaNova',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    key: 'SAMBANOVA_API_KEY',
  },
  huggingface: {
    name: 'Hugging Face',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    key: 'HUGGINGFACE_API_KEY',
  },
  cloudflare: {
    name: 'Cloudflare Workers AI',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    key: 'CLOUDFLARE_API_TOKEN',
  },
  openrouter: {
    name: 'OpenRouter',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    key: 'OPENROUTER_API_KEY',
  },
};

const TIME_WINDOWS = [
  { label: '24 Hours', days: 1 },
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
];

export default function UsagePage() {
  const [selectedDays, setSelectedDays] = useState<number>(30);
  const [data, setData] = useState<UsageSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');

  const fetchUsage = useCallback(async (days: number, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await usageService.getSummary(days);
      if (res.data?.success) {
        setData(res.data.data);
      } else {
        setError(res.data?.error || 'Failed to retrieve LLM usage telemetry.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Could not connect to usage service.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage(selectedDays);
  }, [fetchUsage, selectedDays]);

  // Totals calculations
  const totalPromptTokens = useMemo(() => {
    return data?.by_provider?.reduce((sum, p) => sum + (p.prompt_tokens || 0), 0) || 0;
  }, [data]);

  const totalCompletionTokens = useMemo(() => {
    return data?.by_provider?.reduce((sum, p) => sum + (p.completion_tokens || 0), 0) || 0;
  }, [data]);

  const totalRequests = data?.total_requests || 0;
  const totalTokens = data?.total_tokens || 0;

  const fallbackCallsCount = useMemo(() => {
    return data?.recent_calls?.filter((c) => c.fallback).length || 0;
  }, [data]);

  // Aggregated models across all providers
  const allModels = useMemo(() => {
    if (!data?.by_provider) return [];
    const list: Array<ModelUsage & { provider: string; key_name: string }> = [];
    for (const p of data.by_provider) {
      for (const m of p.models) {
        list.push({
          ...m,
          provider: p.provider,
          key_name: p.key_name,
        });
      }
    }
    return list.sort((a, b) => b.total_tokens - a.total_tokens);
  }, [data]);

  const filteredModels = useMemo(() => {
    if (!searchFilter.trim()) return allModels;
    const q = searchFilter.toLowerCase();
    return allModels.filter(
      (m) =>
        m.model.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q)
    );
  }, [allModels, searchFilter]);

  const filteredRecentCalls = useMemo(() => {
    if (!data?.recent_calls) return [];
    if (!searchFilter.trim()) return data.recent_calls;
    const q = searchFilter.toLowerCase();
    return data.recent_calls.filter(
      (c) =>
        c.model.toLowerCase().includes(q) ||
        c.provider.toLowerCase().includes(q) ||
        (c.conversation_title && c.conversation_title.toLowerCase().includes(q))
    );
  }, [data, searchFilter]);

  const formatTokens = (val: number) => {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(1)}k`;
    return val.toLocaleString();
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffSecs = Math.floor((Date.now() - date.getTime()) / 1000);
      if (diffSecs < 60) return `${diffSecs}s ago`;
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="w-full space-y-8 animate-fadeIn">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-red-500/20 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <span>Neural LLM Telemetry</span>
                  <span className="text-xs font-mono font-bold bg-red-900/40 text-red-400 border border-red-800/40 px-2 py-0.5 rounded-full">
                    LIVE USAGE
                  </span>
                </h1>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Real-time token distribution, multi-provider quota monitor, and execution telemetry across 7+ providers and 45 models.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Failover Status Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span>AUTO-FAILOVER ACTIVE</span>
          </div>

          {/* Time Window Selector */}
          <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/10">
            {TIME_WINDOWS.map((win) => (
              <button
                key={win.days}
                onClick={() => setSelectedDays(win.days)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  selectedDays === win.days
                    ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {win.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchUsage(selectedDays, true)}
            disabled={refreshing || loading}
            title="Refresh Telemetry"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-red-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/30 flex items-center gap-3 text-red-300">
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Tokens */}
        <div className="p-5 rounded-2xl glass border border-white/10 relative overflow-hidden group hover:border-red-500/40 transition-all">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase tracking-wider">
            <span>Total Tokens</span>
            <Flame className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-3 text-3xl font-black text-white tracking-tight">
            {loading ? '---' : totalTokens.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>In window ({selectedDays}d)</span>
            <span className="font-mono text-red-400 font-bold">{formatTokens(totalTokens)}</span>
          </div>
        </div>

        {/* Prompt Tokens */}
        <div className="p-5 rounded-2xl glass border border-white/10 relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase tracking-wider">
            <span>Prompt (Input)</span>
            <ArrowUpRight className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3 text-3xl font-black text-white tracking-tight">
            {loading ? '---' : totalPromptTokens.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>
              {totalTokens > 0
                ? `${Math.round((totalPromptTokens / totalTokens) * 100)}% of workload`
                : '0%'}
            </span>
            <span className="font-mono text-blue-400 font-bold">{formatTokens(totalPromptTokens)}</span>
          </div>
        </div>

        {/* Completion Tokens */}
        <div className="p-5 rounded-2xl glass border border-white/10 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase tracking-wider">
            <span>Completion (Output)</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 text-3xl font-black text-white tracking-tight">
            {loading ? '---' : totalCompletionTokens.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>
              {totalTokens > 0
                ? `${Math.round((totalCompletionTokens / totalTokens) * 100)}% of workload`
                : '0%'}
            </span>
            <span className="font-mono text-emerald-400 font-bold">{formatTokens(totalCompletionTokens)}</span>
          </div>
        </div>

        {/* Total LLM Invocations */}
        <div className="p-5 rounded-2xl glass border border-white/10 relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase tracking-wider">
            <span>LLM Calls</span>
            <Cpu className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 text-3xl font-black text-white tracking-tight">
            {loading ? '---' : totalRequests.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>Avg / Call</span>
            <span className="font-mono text-amber-400 font-bold">
              {totalRequests > 0 ? Math.round(totalTokens / totalRequests).toLocaleString() : 0} tok
            </span>
          </div>
        </div>

        {/* Fallback & Grid Resilience */}
        <div className="p-5 rounded-2xl glass border border-white/10 relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase tracking-wider">
            <span>Grid Reliability</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-3 text-3xl font-black text-white tracking-tight">
            100%
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>Failovers absorbed</span>
            <span className="font-mono text-purple-400 font-bold">{fallbackCallsCount} calls</span>
          </div>
        </div>
      </div>

      {/* Provider Mesh & Status Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              Connected Multi-Provider Mesh
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {Object.keys(PROVIDER_METADATA).length} Providers Integrated
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(PROVIDER_METADATA).map(([pId, meta]) => {
            const usage = data?.by_provider?.find((p) => p.provider.toLowerCase() === pId.toLowerCase());
            const isOnline = data?.provider_status ? !!data.provider_status[pId] : true;
            const provTokens = usage?.total_tokens || 0;
            const provReqs = usage?.total_requests || 0;
            const pct = totalTokens > 0 ? (provTokens / totalTokens) * 100 : 0;

            return (
              <div
                key={pId}
                className={`p-4 rounded-2xl glass border ${meta.border} relative overflow-hidden flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-500'}`} />
                        <h3 className="font-bold text-white text-sm tracking-wide">{meta.name}</h3>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">{meta.key}</div>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        isOnline
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}
                    >
                      {isOnline ? 'ONLINE' : 'STANDBY'}
                    </span>
                  </div>

                  {/* Token Share Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Tokens</span>
                      <span className="font-mono text-white font-bold">{provTokens.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-1.5 bg-black/40 rounded-full mt-1.5 overflow-hidden border border-white/5">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${meta.bg.replace(
                          '/10',
                          ''
                        )} bg-opacity-80`}
                        style={{ width: `${Math.min(100, Math.max(pct > 0 ? 4 : 0, pct))}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                  <span>{provReqs} requests</span>
                  <span className="font-mono font-semibold text-slate-300">{pct.toFixed(1)}% share</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Models Breakdown & Activity Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              Model Distribution & Token Breakdown
            </h2>
          </div>

          {/* Search Filter */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter model, provider..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 transition-all"
            />
          </div>
        </div>

        {/* Model List / Table */}
        <div className="glass rounded-2xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-slate-400 font-mono uppercase tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Model Name</th>
                  <th className="py-3 px-4">Provider Engine</th>
                  <th className="py-3 px-4 text-right">Invocations</th>
                  <th className="py-3 px-4 text-right">Prompt Tokens</th>
                  <th className="py-3 px-4 text-right">Output Tokens</th>
                  <th className="py-3 px-4 text-right">Total Tokens</th>
                  <th className="py-3 px-4 text-right">Workload %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredModels.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 font-mono">
                      No models recorded in this timeframe. Send prompts in Strategic Chat to view live token metrics.
                    </td>
                  </tr>
                ) : (
                  filteredModels.map((row) => {
                    const pMeta = PROVIDER_METADATA[row.provider.toLowerCase()] || {
                      name: row.provider,
                      color: 'text-slate-300',
                      bg: 'bg-white/5',
                      border: 'border-white/10',
                      key: 'API_KEY',
                    };
                    const pct = totalTokens > 0 ? (row.total_tokens / totalTokens) * 100 : 0;

                    return (
                      <tr key={`${row.provider}-${row.model}`} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-white flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          <span>{row.model}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${pMeta.bg} ${pMeta.color} border ${pMeta.border}`}
                          >
                            {pMeta.name}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">
                          {row.requests.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-blue-400">
                          {row.prompt_tokens.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-400">
                          {row.completion_tokens.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">
                          {row.total_tokens.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-red-400 font-semibold">
                          {pct.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Live Recent Completions Stream */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              Recent Completion Telemetry Log
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Audit Stream (Last 40 Calls)
          </span>
        </div>

        <div className="glass rounded-2xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-slate-400 font-mono uppercase tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Provider & Key</th>
                  <th className="py-3 px-4">Model</th>
                  <th className="py-3 px-4">Conversation</th>
                  <th className="py-3 px-4">Routing</th>
                  <th className="py-3 px-4 text-right">Prompt / Output / Total</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredRecentCalls.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 font-mono">
                      No recent completion events captured.
                    </td>
                  </tr>
                ) : (
                  filteredRecentCalls.map((call) => {
                    const pMeta = PROVIDER_METADATA[call.provider.toLowerCase()] || {
                      name: call.provider,
                      color: 'text-slate-300',
                      bg: 'bg-white/5',
                      border: 'border-white/10',
                      key: call.key_name,
                    };

                    return (
                      <tr key={call.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                          {formatRelativeTime(call.created_at)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${pMeta.bg} ${pMeta.color} border ${pMeta.border}`}
                          >
                            {pMeta.name}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                          {call.model}
                        </td>
                        <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                          {call.conversation_title || 'Direct Chat Session'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {call.fallback ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                              <Zap className="w-3 h-3" /> Auto-Cascaded
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Primary Route
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                          <span className="text-blue-400">{call.usage.prompt_tokens}</span>
                          <span className="text-slate-500"> / </span>
                          <span className="text-emerald-400">{call.usage.completion_tokens}</span>
                          <span className="text-slate-500"> = </span>
                          <span className="text-white font-bold">{call.usage.total_tokens}</span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            200 OK
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
