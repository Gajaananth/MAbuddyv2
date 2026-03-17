// Shared Types (Mirroring Backend)

export interface Conversation {
    id: string;
    title: string;
    topic_tag: string | null;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
}

export interface Message {
    id: string;
    conversation_id: string;
    role: 'user' | 'nova';
    content: string;
    metadata: MessageMetadata | null;
    created_at: string;
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
    action_type?: string;
    approved?: boolean;
    stopped?: boolean;
}

export interface FilterScores {
    long_term_profit: number;
    trust: number;
    fairness: number;
    hype_level: number;
    overall: number;
}

export interface TrendAnalysis {
    id: string;
    topic: string;
    analysis: TrendData;
    score: number;
    created_at: string;
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
    created_at: string;
}

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    category: string;
    risk_level: 'Low' | 'Medium' | 'High';
    monetization_potential: string;
    content: string;
    is_read: boolean | number;
    is_archived: boolean | number;
    priority: 'normal' | 'high' | 'critical';
    metadata?: {
        confidence?: number;
        is_blinking?: boolean;
        alert_type?: string;
        finding_id?: string;
    } | null;
    created_at: string;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: string;
}
