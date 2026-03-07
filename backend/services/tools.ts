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

export const trendAnalyzerTool = tool({
    name: 'trend_analyzer',
    description: 'Analyze recent intelligence findings to identify emerging trends, fairness scores, and market signals.',
    inputSchema: z.object({
        userId: z.string().describe('The Operator ID / User ID'),
        category: z.string().optional().describe('Optional category filter (e.g. "AI Agent Intelligence", "Marketing Intelligence")'),
        limit: z.number().optional().describe('Number of recent findings to analyze (default: 10)'),
    }),
    execute: async ({ userId, category, limit }) => {
        try {
            const { getRaidResults } = await import('../db/queries.js');
            const results = await getRaidResults(userId, limit || 10);

            const filtered = category
                ? results.filter((r: any) => r.category?.toLowerCase().includes(category.toLowerCase()))
                : results;

            if (filtered.length === 0) {
                return { success: false, message: 'No trend data available. Initiate an Internet Ride to gather intelligence.' };
            }

            const categories = [...new Set(filtered.map((r: any) => r.category))];
            const avgScore = filtered.reduce((sum: number, r: any) => sum + (r.opportunity_score || 0), 0) / filtered.length;

            return {
                success: true,
                totalFindings: filtered.length,
                categories,
                averageOpportunityScore: Math.round(avgScore),
                topFindings: filtered.slice(0, 5).map((r: any) => ({
                    category: r.category,
                    risk: r.risk_level,
                    platform: r.source_platform,
                    score: r.opportunity_score,
                    summary: r.summary || r.content?.substring(0, 200),
                })),
            };
        } catch (error: any) {
            return { success: false, error: `Trend Analysis Failure: ${error.message}` };
        }
    },
});

export const scamDetectorTool = tool({
    name: 'scam_detector',
    description: 'Evaluate a platform, URL, or opportunity description for scam probability and legitimacy signals.',
    inputSchema: z.object({
        target: z.string().describe('The platform name, URL, or opportunity description to evaluate'),
        userId: z.string().describe('The Operator ID / User ID'),
    }),
    execute: async ({ target, userId }) => {
        try {
            const scamPatterns = [
                'guaranteed returns', 'get rich quick', 'no risk', '100% profit',
                'limited time only', 'act now', 'secret method', 'passive income guaranteed',
                'mlm', 'pyramid', 'ponzi', 'too good to be true',
                'send crypto first', 'double your money', 'free money',
            ];

            const targetLower = target.toLowerCase();
            const flagged = scamPatterns.filter(p => targetLower.includes(p));
            const scamScore = Math.min(100, flagged.length * 25);

            let verdict: string;
            if (scamScore >= 75) verdict = '🚨 HIGH SCAM PROBABILITY — Avoid';
            else if (scamScore >= 50) verdict = '⚠️ SUSPICIOUS — Requires deep verification';
            else if (scamScore >= 25) verdict = '🟡 MODERATE RISK — Proceed with caution';
            else verdict = '✅ LOW RISK — No obvious scam patterns detected';

            return {
                success: true,
                target,
                scamScore,
                verdict,
                flaggedPatterns: flagged,
                recommendation: scamScore >= 50
                    ? 'Do NOT invest time or money without independent verification from multiple credible sources.'
                    : 'Initial scan looks clean. Still recommended to verify through independent research.',
            };
        } catch (error: any) {
            return { success: false, error: `Scam Detection Failure: ${error.message}` };
        }
    },
});

export const defaultTools = [trendAnalyzerTool, scamDetectorTool, internetRideTool];
