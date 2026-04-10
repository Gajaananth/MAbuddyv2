// Zium Nova — Shared TypeScript Types

export type TaskOwner = 'OPERATOR' | 'NOVA' | 'SHARED';
export type TaskDuration = 'SHORT' | 'MEDIUM' | 'LONG';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED' | 'PENDING' | 'PROCESS' | 'DONE' | 'BLOCKED';

export interface Task {
    id: string;
    user_id: string;
    task_id_str: string;
    task_name: string;
    owner: TaskOwner;
    status: TaskStatus;
    priority: TaskPriority;
    action_plan: string;
    duration: TaskDuration;
    notes?: string;
    is_archived: boolean;
    deadline?: Date;
    created_at: Date;
    updated_at: Date;
}

export interface Conversation {
    id: string;
    title: string;
    topic_tag: string | null;
    is_deleted: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface Message {
    id: string;
    conversation_id: string;
    role: 'user' | 'nova';
    content: string;
    metadata: MessageMetadata | null;
    created_at: Date;
}

export interface MessageMetadata {
    filter_scores?: FilterScores;
    production_scores?: {
        profit_potential: number;
        trustworthiness: number;
        scalability: number;
        ethical_impact: number;
        overall: number;
    };
    flags?: string[];
    approved?: boolean;
    action_type?: string;
}

export interface FilterScores {
    long_term_profit: number;   // 0-100
    trust: number;              // 0-100
    fairness: number;           // 0-100
    hype_level: number;         // 0-100 (lower is better)
    overall: number;            // 0-100
}

export interface TrendAnalysis {
    id: string;
    topic: string;
    analysis: TrendData;
    score: number;
    created_at: Date;
}

export interface TrendData {
    summary: string;
    fairness_score: number;
    scam_indicators: string[];
    ethical_opportunities: string[];
    recommendations: string[];
    unfair_patterns: string[];
}

export interface Agent {
    id: string;
    name: string;
    trust_score: number;
    capabilities: string[];
    status: 'active' | 'inactive' | 'flagged';
    description: string;
    created_at: Date;
}

export interface OpenClawRequest {
    prompt: string;
    memory_context: string;
    system_role: string;
    temperature?: number;
    max_tokens?: number;
}

export interface OpenClawResponse {
    content: string;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export interface FilterResult {
    approved: boolean;
    filtered_content: string;
    scores: FilterScores;
    flags: string[];
    raw_content: string;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: string;
}
