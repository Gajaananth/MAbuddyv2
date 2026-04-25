import { normalizeTask } from './adapters.js';
import { scoreTask } from './scoring.js';
import { dispatchToCommandCenter } from './executionBridge.js';
import { ExternalTask, ScoredTask } from './types.js';

export * from './types.js';

/**
 * Pipeline Integration Hook
 * Injects the earning module into the ACTION -> TASK -> TRACKING stage.
 */
export async function processEarningOpportunity(userId: string, rawData: any, platform: string, existingPipelineScore: number = 50): Promise<ScoredTask | null> {
    console.log(`[Earning Engine] Processing opportunity from ${platform}...`);
    
    // 1. Normalize
    const task: ExternalTask | null = normalizeTask(rawData, platform);
    if (!task) return null;

    // 2. Score
    const scoredTask = scoreTask(task, existingPipelineScore);
    console.log(`[Earning Engine] Scored Task: ${scoredTask.final_score} (Earning Score: ${scoredTask.earning_score})`);

    // 3. Dispatch to Action Layer (Execution Bridge)
    await dispatchToCommandCenter(userId, scoredTask);

    return scoredTask;
}
