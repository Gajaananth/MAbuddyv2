import { ExternalTask, ScoredTask } from './types.js';

/**
 * Extends the existing pipeline scoring WITHOUT replacing it.
 * Calculates earning_score = reward / estimated_time.
 * final_score = existing_pipeline_score + earning_score_weight.
 */
export function scoreTask(task: ExternalTask, existingPipelineScore: number = 0): ScoredTask {
    // Avoid division by zero
    const safeTime = task.estimated_time > 0 ? task.estimated_time : 1;
    
    // Calculate raw earning efficiency (reward per minute/unit time)
    const earningScore = task.reward / safeTime;
    
    // Normalize or scale the earning score weight (e.g., multiplier based on platform trust)
    const earningScoreWeight = Math.min(earningScore * 10, 50); // Cap the earning influence to 50 points

    const finalScore = existingPipelineScore + earningScoreWeight;

    return {
        ...task,
        earning_score: earningScore,
        final_score: Math.round(finalScore)
    };
}
