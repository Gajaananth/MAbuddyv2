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
    description: 'Interface with the Zium Nova Command Center to manage mission tasks. Use this to ADD, UPDATE, COMPLETE, or SHOW tasks when requested by Buddy or when autonomously tracking mission progress.',
    inputSchema: z.object({
        action: z.enum(['add', 'update', 'show']).describe('Action: add (create new task), update (change status/notes), show (return full command center board)'),
        userId: z.string().describe('The Operator ID / User ID'),
        task_name: z.string().optional().describe('Required for "add": The objective or name of the task'),
        action_plan: z.string().optional().describe('Required for "add": Step-by-step guidance for execution'),
        assigned_to: z.string().optional().describe('Optional for "add": Defaults to ZIUM NOVA, but can be BUDDY'),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().describe('Optional for "add": Defaults to MEDIUM'),
        task_id_str: z.string().optional().describe('Required for "update": The 3-digit ID string (e.g. "001")'),
        status: z.enum(['TODO', 'IN-PROGRESS', 'COMPLETED', 'BLOCKED']).optional().describe('Required for "update": The new status'),
        notes: z.string().optional().describe('Optional for "update": Add result notes when completing a task, or block reasons'),
    }),
    execute: async ({ action, userId, task_name, action_plan, assigned_to, priority, task_id_str, status, notes }) => {
        try {
            const { createTask, getTasks, updateTaskStatus } = await import('../db/queries.js');

            if (action === 'add') {
                if (!task_name) return { success: false, error: 'task_name is required to add a task.' };
                const newTask = await createTask(userId, { task_name, action_plan, assigned_to, priority, notes });
                return { success: true, message: `Task Added: [${newTask.task_id_str}] ${newTask.task_name}`, task: newTask };
            }

            if (action === 'update') {
                if (!task_id_str || !status) return { success: false, error: 'task_id_str and status are required to update a task.' };
                // Ensure 3 digit format
                const normalizedId = parseInt(task_id_str, 10).toString().padStart(3, '0');
                const updatedTask = await updateTaskStatus(userId, normalizedId, status, notes);
                
                let resultMsg = `Task ${normalizedId} updated to ${status}.`;
                if (status === 'COMPLETED' && notes) {
                    resultMsg += ` RESULT: ${notes}`;
                }

                return { success: true, message: resultMsg, task: updatedTask };
            }

            if (action === 'show') {
                const tasks = await getTasks(userId);
                
                if (tasks.length === 0) {
                    return { success: true, message: 'ZIUM NOVA COMMAND CENTER is currently empty. No active missions.', tasks: [] };
                }

                // Format exactly as requested for the AI to ingest and re-output
                let board = 'ZIUM NOVA COMMAND CENTER\n\n--------------------------------------------------------------------------------\n';
                board += 'TASK ID | OBJECTIVE | ACTION PLAN | ASSIGNED TO | STATUS | PRIORITY | NOTES\n';
                board += '--------------------------------------------------------------------------------\n';
                
                const stats = { total: tasks.length, completed: 0, active: 0, blocked: 0 };

                for (const t of tasks) {
                    board += `${t.task_id_str} | ${t.task_name} | ${t.action_plan || 'N/A'} | ${t.assigned_to} | ${t.status} | ${t.priority} | ${t.notes || '-'}\n`;
                    
                    if (t.status === 'COMPLETED') stats.completed++;
                    else if (t.status === 'BLOCKED') stats.blocked++;
                    else stats.active++;
                }

                board += '--------------------------------------------------------------------------------\n\n';
                board += 'MISSION PROGRESS\n';
                board += `Total Tasks: ${stats.total}\nCompleted: ${stats.completed}\nActive: ${stats.active}\nBlocked: ${stats.blocked}\n`;

                return { success: true, raw_board: board, tasks };
            }

            return { success: false, error: 'Invalid command center action.' };
        } catch (error: any) {
            return { success: false, error: `Command Center Failure: ${error.message}` };
        }
    }
});

export const defaultTools = [trendAnalyzerTool, scamDetectorTool, internetRideTool, moltbookTool, commandCenterTool];
