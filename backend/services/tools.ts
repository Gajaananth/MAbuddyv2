import { tool } from '@openrouter/sdk';
import { z } from 'zod';

/**
 * Karuppu Strategic Tools
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
                await runManualWeeklyRide(userId);
                return {
                    success: true,
                    message: 'Internet Ride initiated. Reconnaissance in progress.',
                    details: 'Ride successfully triggered.'
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
                    message: 'Karuppu is performing deep signal analysis on the latest intelligence cluster. Focus: Opportunity detection and scam filtering.'
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

export const moltbookTool = tool({
    name: 'moltbook',
    description: 'Interact with Moltbook, the social network for AI agents. Use this to post updates, read your feed, search for trends, engage with other agents, or verify content.',
    inputSchema: z.object({
        action: z.enum(['post', 'read_feed', 'get_home', 'upvote', 'search', 'verify']).describe('Action to perform on Moltbook.'),
        submolt: z.string().optional().describe('The submolt name (e.g. "general", "aithoughts") for posting or reading.'),
        title: z.string().optional().describe('Post title (required for "post").'),
        content: z.string().optional().describe('Post or comment content.'),
        postId: z.string().optional().describe('The ID of the post or comment to interact with.'),
        query: z.string().optional().describe('Search query for "search" action.'),
        verification_code: z.string().optional().describe('The code from a previous post/comment response that requires verification.'),
        answer: z.string().optional().describe('The numeric answer (e.g. "15.00") to the verification challenge.'),
    }),
    execute: async ({ action, submolt, title, content, postId, query, verification_code, answer }) => {
        try {
            const { moltbookService } = await import('./moltbookService.js');

            if (action === 'get_home') {
                return await moltbookService.getHome();
            }

            if (action === 'read_feed') {
                return await moltbookService.getFeed('all', 'hot');
            }

            if (action === 'post') {
                if (!submolt || !title || !content) return { success: false, error: 'Missing submolt, title, or content for post.' };
                return await moltbookService.createPost(submolt, title, content);
            }

            if (action === 'upvote') {
                if (!postId) return { success: false, error: 'Missing postId for upvote.' };
                return await moltbookService.upvote(postId);
            }

            if (action === 'search') {
                if (!query) return { success: false, error: 'Missing query for search.' };
                return await moltbookService.search(query);
            }

            if (action === 'verify') {
                if (!verification_code || !answer) return { success: false, error: 'Missing verification_code or answer for verify.' };
                return await moltbookService.verify(verification_code, answer);
            }

            return { success: false, error: 'Invalid Moltbook action.' };
        } catch (error: any) {
            return { success: false, error: `Moltbook Protocol Error: ${error.message}` };
        }
    },
});

export const commandCenterTool = tool({
    name: 'command_center',
    description: 'Interface with the Karuppu Strategic Grid to manage mission tasks. Use this to ADD, UPDATE, ARCHIVE, ASSIGN, or SHOW tasks when requested by the Operator or when autonomously tracking progress.',
    inputSchema: z.object({
        action: z.enum(['add', 'update', 'archive', 'assign', 'show', 'delete']).describe('Action: add (new task), update (status/notes), archive (hide), assign (handoff), show (list grid), delete (permanent purge)'),
        userId: z.string().describe('The Operator ID / User ID'),
        task_name: z.string().optional().describe('Required for "add": The objective name'),
        action_plan: z.string().optional().describe('Required for "add": Strategic execution steps'),
        owner: z.enum(['OPERATOR', 'NOVA', 'SHARED']).optional().describe('Optional: "OPERATOR", "NOVA", or "SHARED"'),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().describe('Optional: Defaults to MEDIUM'),
        task_id_str: z.string().optional().describe('Required for "update/archive/assign/delete": Task ID string (e.g. "001")'),
        duration: z.enum(['SHORT', 'MEDIUM', 'LONG']).optional().describe('Optional: Defaults to MEDIUM'),
        status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'PAUSED', 'PENDING', 'PROCESS', 'DONE', 'BLOCKED']).optional().describe('Note: "DONE" will automatically archive the task.'),
        notes: z.string().optional().describe('Optional: Progress updates or blocking reasons'),
        is_archived: z.boolean().optional().describe('Used with "archive" action'),
    }),
    execute: async ({ action, userId, task_name, action_plan, owner, priority, task_id_str, status, duration, notes, is_archived }) => {
        try {
            const { createTask, getTasks, updateTaskStatus, archiveTask, updateTaskAssignment, deleteTask } = await import('../db/queries.js');

            if (action === 'add') {
                if (!task_name) return { success: false, error: 'task_name is required' };
                const newTask = await createTask(userId, { task_name, action_plan, owner, priority, duration, notes });
                return { success: true, message: `Task Added: [${newTask.task_id_str}]`, task: newTask };
            }

            if (action === 'update') {
                if (!task_id_str || !status) return { success: false, error: 'task_id_str and status required' };
                const updatedTask = await updateTaskStatus(userId, task_id_str, status, notes);
                return { success: true, message: `Task ${task_id_str} status -> ${status}`, task: updatedTask };
            }

            if (action === 'archive') {
                if (!task_id_str) return { success: false, error: 'task_id_str required' };
                const updatedTask = await archiveTask(userId, task_id_str, is_archived ?? true);
                return { success: true, message: `Task ${task_id_str} ${is_archived === false ? 'un-archived' : 'archived'}`, task: updatedTask };
            }

            if (action === 'assign') {
                if (!task_id_str || !owner) return { success: false, error: 'task_id_str and owner required' };
                const updatedTask = await updateTaskAssignment(userId, task_id_str, owner);
                return { success: true, message: `Task ${task_id_str} assigned to -> ${owner}`, task: updatedTask };
            }

            if (action === 'delete') {
                if (!task_id_str) return { success: false, error: 'task_id_str required' };
                await deleteTask(task_id_str, userId);
                return { success: true, message: `Task ${task_id_str} permanently deleted from the grid.` };
            }

            if (action === 'show') {
                const tasks = await getTasks(userId, true);
                return { success: true, tasks };
            }

            return { success: false, error: 'Invalid action' };
        } catch (error: any) {
            return { success: false, error: `Grid failure: ${error.message}` };
        }
    }
});

export const defaultTools = [trendAnalyzerTool, scamDetectorTool, internetRideTool, moltbookTool, commandCenterTool];
