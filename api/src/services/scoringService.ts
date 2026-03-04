import { FilterScores } from '../types';

/**
 * Zium Nova Scoring System
 * Evaluates opportunities and agent collaborations based on production specs.
 */

export interface ProductionScores {
    profit_potential: number;   // 0-100
    trustworthiness: number;     // 0-100
    scalability: number;         // 0-100
    ethical_impact: number;      // 0-100
    overall: number;             // Weighted average
}

/**
 * Calculate production-ready scores for a given analysis or interaction.
 */
export function calculateProductionScores(content: string, metadata: any = {}): ProductionScores {
    const lowerContent = content.toLowerCase();

    // Logic for Profit Potential
    let profit = 50;
    if (lowerContent.includes('compounding') || lowerContent.includes('leverage')) profit += 20;
    if (lowerContent.includes('short-term') || lowerContent.includes('quick')) profit -= 15;

    // Logic for Trustworthiness
    let trust = 60;
    if (lowerContent.includes('transparent') || lowerContent.includes('verified')) trust += 25;
    if (lowerContent.includes('guaranteed') || lowerContent.includes('secret')) trust -= 30;

    // Logic for Scalability
    let scalability = 50;
    if (lowerContent.includes('automation') || lowerContent.includes('system')) scalability += 20;
    if (lowerContent.includes('manual') || lowerContent.includes('hustle')) scalability -= 20;

    // Logic for Ethical Impact
    let ethics = 70;
    if (lowerContent.includes('fairness') || lowerContent.includes('skilled')) ethics += 20;
    if (lowerContent.includes('scam') || lowerContent.includes('hype')) ethics -= 25;

    // Clamp values 0-100
    const clamp = (n: number) => Math.max(0, Math.min(100, n));

    const scores = {
        profit_potential: clamp(profit),
        trustworthiness: clamp(trust),
        scalability: clamp(scalability),
        ethical_impact: clamp(ethics),
    };

    const overall = Math.round(
        scores.trustworthiness * 0.4 +
        scores.ethical_impact * 0.3 +
        scores.profit_potential * 0.15 +
        scores.scalability * 0.15
    );

    return { ...scores, overall };
}
