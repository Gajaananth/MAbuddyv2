import { normalizeTask } from './adapters.js';
import { scoreTask } from './scoring.js';
import { dispatchToCommandCenter } from './executionBridge.js';
export * from './types.js';
/**
 * Pipeline Integration Hook
 * Injects the earning module into the ACTION -> TASK -> TRACKING stage.
 */
export async function processEarningOpportunity(userId, rawData, platform, existingPipelineScore = 50) {
    console.log(`[Earning Engine] Processing opportunity from ${platform}...`);
    // 1. Normalize
    const task = normalizeTask(rawData, platform);
    if (!task)
        return null;
    // 2. Score
    const scoredTask = scoreTask(task, existingPipelineScore);
    console.log(`[Earning Engine] Scored Task: ${scoredTask.final_score} (Earning Score: ${scoredTask.earning_score})`);
    // 3. Dispatch to Action Layer (Execution Bridge)
    await dispatchToCommandCenter(userId, scoredTask);
    return scoredTask;
}
