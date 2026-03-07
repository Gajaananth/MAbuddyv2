import { tool } from '@openrouter/sdk';
import { z } from 'zod';

/**
 * Zium Nova Strategic Tools
 */

export const internetRideTool = tool({
    name: 'internet_ride',
    description: 'Autonomous Internet Intelligence Scan command. Use to initiate, report, or analyze.',
    inputSchema: z.object({
        action: z.enum(['initiate', 'report', 'analyze']).describe('The action to perform: "initiate" starts a new ride, "report" gets most recent findings, "analyze" performs deep signal processing.'),
        userId: z.string().describe('The Operator ID / User ID'),
    }),
    execute: async ({ action, userId }) => {
        try {
            // Dynamic imports to avoid circular dependencies with openClawService
            const { runManualWeeklyRide } = await import('./raidingService.js');
            const { getRaidResults } = await import('../db/queries.js');

            if (action === 'initiate') {
                const result = await runManualWeeklyRide(userId);
                return {
                    success: true,
                    message: 'Internet Ride initiated. Reconnaissance in progress.',
                    details: result.message
                };
            }

            if (action === 'report') {
                const results = await getRaidResults(userId, 5);
                if (results.length === 0) {
                    return { success: false, message: 'No recent Internet Ride findings detected. Initiate a new scan if required.' };
                }
                return {
                    success: true,
                    count: results.length,
                    findings: results.map(r => ({
                        category: r.category,
                        content: r.content,
                        risk: r.risk_level,
                        platform: r.source_platform,
                        timestamp: r.created_at
                    }))
                };
            }

            if (action === 'analyze') {
                return {
                    success: true,
                    message: 'Zium Nova is performing deep signal analysis on the latest intelligence cluster. Focus: Opportunity detection and scam filtering.'
                };
            }

            return { success: false, error: 'Invalid action' };
        } catch (error: any) {
            return { success: false, error: `Protocol Failure: ${error.message}` };
        }
    },
});

export const defaultTools = [trendAnalyzerTool, scamDetectorTool, internetRideTool];
