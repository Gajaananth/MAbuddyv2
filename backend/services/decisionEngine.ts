import { pool } from '../db/connection';

export interface DecisionOption {
    id: string;
    description: string;
    strategic_value: number;
    estimated_reward: number;
    estimated_effort: number;
    urgency: number;
    risk_level: number;
    operator_alignment: number;
    confidence_score: number;
}

export interface DecisionResult {
    recommended_action: string;
    score: number;
    reason: string;
}

export const evaluateDecision = (options: DecisionOption[], context: any): DecisionResult => {
    if (!options || options.length === 0) {
        return {
            recommended_action: 'None',
            score: 0,
            reason: 'No options provided'
        };
    }

    let bestOption: DecisionOption | null = null;
    let highestScore = -Infinity;

    for (const option of options) {
        // Weighted scoring algorithm
        const score = (
            (option.strategic_value * 1.5) +
            (option.estimated_reward * 2.0) -
            (option.estimated_effort * 1.0) +
            (option.urgency * 1.2) -
            (option.risk_level * 1.5) +
            (option.operator_alignment * 1.5) +
            (option.confidence_score * 1.0)
        );

        if (score > highestScore) {
            highestScore = score;
            bestOption = option;
        }
    }

    if (!bestOption) {
        return {
            recommended_action: 'None',
            score: 0,
            reason: 'Failed to evaluate options'
        };
    }

    return {
        recommended_action: bestOption.description,
        score: parseFloat((highestScore / 10).toFixed(1)), // normalize score out of 10
        reason: `Highest score based on strategic value and reward vs effort. Confidence: ${bestOption.confidence_score}`
    };
};
