export interface ExternalTask {
    id: string;
    platform: string;
    type: string;
    reward: number;
    estimated_time: number;
    url: string;
    metadata: Record<string, any>;
}

export interface ScoredTask extends ExternalTask {
    earning_score: number;
    final_score: number;
}
