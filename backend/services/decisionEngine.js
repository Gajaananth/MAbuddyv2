export const evaluateDecision = (options, context) => {
    if (!options || options.length === 0) {
        return {
            recommended_action: 'None',
            score: 0,
            reason: 'No options provided'
        };
    }
    let bestOption = null;
    let highestScore = -Infinity;
    for (const option of options) {
        // Weighted scoring algorithm
        const score = ((option.strategic_value * 1.5) +
            (option.estimated_reward * 2.0) -
            (option.estimated_effort * 1.0) +
            (option.urgency * 1.2) -
            (option.risk_level * 1.5) +
            (option.operator_alignment * 1.5) +
            (option.confidence_score * 1.0));
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
