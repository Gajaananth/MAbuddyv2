import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { think } from '../services/openClawService.js';
import { applyFilter } from '../filters/silentBeastFilter.js';
import { calculateProductionScores } from '../services/scoringService.js';
import { postToMoltbook } from '../services/moltbookService.js';
import { missionService } from '../services/missionService.js';
import * as db from '../db/queries.js';
import { ApiResponse } from '../types/index.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/chat/poll
 * Poll for new messages in a specific conversation since a given timestamp.
 */
router.get('/poll', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId || 'default_user';
        const { conversation_id, since } = req.query;

        if (!conversation_id || typeof conversation_id !== 'string') {
            return res.status(400).json({ success: false, error: 'conversation_id is required' });
        }
        
        // We need a specific query for this to be efficient, but for now we'll fetch details and filter.
        // A better approach would be a dedicated db query: db.getMessagesSince(convId, since)
        const responseData = await db.getConversationDetail(conversation_id, userId);
        
        if (!responseData) {
            return res.status(404).json({ success: false, error: 'Conversation not found' });
        }

        let newMessages = responseData.messages;
        
        if (since && typeof since === 'string') {
            const sinceDate = new Date(since);
            newMessages = newMessages.filter(m => new Date(m.created_at) > sinceDate);
        }

        res.json({
            success: true,
            data: {
                messages: newMessages.map(m => ({
                    ...m,
                    metadata: typeof m.metadata === 'string' ? JSON.parse(m.metadata) : m.metadata
                }))
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Chat] Poll Error:', error);
        res.status(500).json({ success: false, error: 'Failed to poll messages' });
    }
});

/**
 * POST /api/chat
 * Send a message to Zium Nova and get a strategic, scored response.
 */
router.post('/', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId || 'default_user';
        const { message, conversation_id, publish_to_moltbook } = req.body;

        if (!message || typeof message !== 'string') {
            const response: ApiResponse = {
                success: false,
                error: 'Message is required',
                timestamp: new Date().toISOString(),
            };
            res.status(400).json(response);
            return;
        }

        let convId = conversation_id;
        let memoryContext = '';

        // Retrieve or create conversation
        if (!convId) {
            console.log('[Chat] Creating new conversation...');
            const conv = await db.createConversation(userId, message.slice(0, 100));
            convId = conv.id;

            // Auto-generate topic tag in the background
            setTimeout(async () => {
                try {
                    const tagResponse = await think(`Generate a single 1-3 word topic tag for this message: "${message}". Output ONLY the tag.`, '', {}, userId);
                    const cleanTag = tagResponse.content.trim().replace(/["']/g, '');
                    await db.updateConversationTopic(convId, userId, cleanTag);
                    console.log(`[Chat] Auto-tagged conversation ${convId} as: ${cleanTag}`);
                } catch (e) {
                    console.error('[Chat] Auto-tagging failed:', e);
                }
            }, 0);
        }

        console.log('[Chat] Adding user message...');
        // Store user message
        await db.addMessage(convId, 'user', message);

        // --- Task Intent Processing (NEW: Autonomous Dashboard Update) ---
        missionService.processTaskIntent(userId, message).catch(e => console.error('[Chat] Task intent failed:', e));

        // Weekly Ride / Internet Raid Command Recognition (CHECK BEFORE THINKING)
        const lowerMessage = message.toLowerCase();
        const raidTriggers = [
            /weekly ride/i,
            /run weekly ride/i,
            /internet raid/i,
            /internet ride/i,
            /run raid/i,
            /start ride/i,
            /start raid/i,
            /execute raid/i
        ];

        const isRaidCommand = raidTriggers.some(rgx => rgx.test(lowerMessage));

        if (isRaidCommand) {
            console.log(`[Chat] Internet Raid trigger detected: "${message}"`);
            const { runManualWeeklyRide } = await import('../services/raidingService.js');
            runManualWeeklyRide(userId).catch(console.error);

            const response: ApiResponse = {
                success: true,
                data: {
                    conversation_id: convId,
                    message: {
                        role: 'nova',
                        content: '🚨 **Internet Raid Initialized.** \n\nStrategic intelligence gathering is now active. Buddy, I am scanning ecosystems across Moltbook, global signals, and the regional markets. I will identify market shifts, high-leverage opportunities, and structural patterns. Results will be logged and analyzed.',
                        metadata: { action_type: 'weekly_ride' },
                    },
                },
                timestamp: new Date().toISOString(),
            };
            res.json(response);
            return;
        }

        console.log('[Chat] Retrieving memory context...');
        // Retrieve memory context for RAG
        memoryContext = await db.getRecentMemoryContext(convId, 10);

        console.log('[Chat] Thinking...');
        // Send to Zium Nova's brain (OpenClaw / OpenAI / Gemini)
        const openClawResponse = await think(message, memoryContext, {}, userId);

        // Determine if analytics are requested (Specifically matching Rule 3)
        const analyticsRequested = lowerMessage.includes('activate analytics mode');

        // Force strategic mode if "STRICT RESPONSE FORMAT" is used (Rule 1 & 4)
        const forceStrategic = lowerMessage.includes('strict response format');

        // --- Intelligence Archive Management ---

        // 1. Filtering Commands
        const filterMatch = lowerMessage.match(/show (all|high-risk|low-risk|moderate-risk) reports( tagged "(.+)")?( this month| from (.+))?( with opportunity score above (\d+))?/i);
        if (filterMatch || lowerMessage.includes('show reports')) {
            console.log('[Chat] Filtering Intelligence Reports...');
            const filters: any = {};
            if (lowerMessage.includes('tagged')) {
                filters.topic = lowerMessage.match(/tagged "(.+)"/i)?.[1];
            }
            if (lowerMessage.includes('high-risk')) filters.risk_level = 'High';
            if (lowerMessage.includes('opportunity score above')) {
                filters.min_score = parseInt(lowerMessage.match(/above (\d+)/i)?.[1] || '0');
            }
            // Logic for date range would go here...

            const reports = await db.filterReports(userId, filters);
            let content = `### Intelligence Archive Search Results\n\n`;
            if (reports.length === 0) {
                content += "No reports found matching your criteria.";
            } else {
                content += reports.map(r => `- **[${r.id.slice(0, 8)}]** ${new Date(r.created_at).toLocaleDateString()} | ${r.ride_type.toUpperCase()} | Score: ${r.opportunity_score}/100 | Risk: ${r.status === 'archived' ? '[ARCHIVED]' : 'Active'}`).join('\n');
            }

            const response: ApiResponse = {
                success: true,
                data: {
                    conversation_id: convId,
                    message: { role: 'nova', content, metadata: { action: 'filter_reports', count: reports.length } },
                },
                timestamp: new Date().toISOString(),
            };
            res.json(response);
            return;
        }

        // 2. Export Commands
        const exportMatch = lowerMessage.match(/export report ([a-z0-9-]+) to (pdf|word)/i);
        if (exportMatch) {
            const [, reportId, format] = exportMatch;
            console.log(`[Chat] Exporting report ${reportId} to ${format}...`);

            const reports = await db.getRaidResults(userId, 100);
            const report = reports.find(r => r.id === reportId || r.id.startsWith(reportId));

            if (!report) {
                res.json({ success: true, data: { conversation_id: convId, message: { role: 'nova', content: `Report ID ${reportId} not found.` } }, timestamp: new Date().toISOString() });
                return;
            }

            let filePath = '';
            if (format.toLowerCase() === 'pdf') {
                const { generateIntelligencePDF } = await import('../services/pdfService.js');
                filePath = await generateIntelligencePDF(report);
            } else {
                const { generateIntelligenceDocx } = await import('../services/docxService.js');
                filePath = await generateIntelligenceDocx(report);
            }

            const response: ApiResponse = {
                success: true,
                data: {
                    conversation_id: convId,
                    message: {
                        role: 'nova',
                        content: `✅ **Export Complete.** Report archived as ${format.toUpperCase()}.\n\nPath: \`${filePath}\``,
                        metadata: { action: 'export_report', file_path: filePath }
                    },
                },
                timestamp: new Date().toISOString(),
            };
            res.json(response);
            return;
        }

        // 3. Deletion Commands
        const deleteMatch = lowerMessage.match(/(delete|soft delete|permanent delete) report ([a-z0-9-]+)/i);
        if (deleteMatch) {
            const [, type, reportId] = deleteMatch;
            const isPermanent = type.includes('permanent');

            if (isPermanent && !lowerMessage.includes('confirm')) {
                res.json({ success: true, data: { conversation_id: convId, message: { role: 'nova', content: `⚠️ **Confirmation Required.** To permanently delete report ${reportId}, please type: \`confirm permanent delete report ${reportId}\`` } }, timestamp: new Date().toISOString() });
                return;
            }

            if (isPermanent) {
                await db.permanentDeleteReport(reportId, userId);
            } else {
                await db.softDeleteReport(reportId, userId);
            }

            const response: ApiResponse = {
                success: true,
                data: {
                    conversation_id: convId,
                    message: { role: 'nova', content: `🛡️ Report ${reportId} has been ${isPermanent ? 'PERMANENTLY DELETED' : 'ARCHIVED'}.` },
                },
                timestamp: new Date().toISOString(),
            };
            res.json(response);
            return;
        }

        let content = openClawResponse.content;
        let metadata: any = null;

        if (analyticsRequested && !forceStrategic) {
            console.log('[Chat] Analytics requested. Running scoring and filtering...');
            // Apply Silent Beast / Truth Exposer filter
            const filterResult = applyFilter(content);

            // Calculate Production Metrics
            const productionScores = calculateProductionScores(filterResult.filtered_content);

            // Combine metadata
            metadata = {
                filter_scores: filterResult.scores,
                production_scores: productionScores,
                flags: filterResult.flags,
                approved: filterResult.approved,
            };
            content = filterResult.filtered_content;
        } else {
            console.log('[Chat] Strategic mode. Skipping metrics.');
        }

        console.log('[Chat] Storing Nova response...');
        // Store Nova's response
        await db.addMessage(convId, 'nova', content, metadata);

        // Synchronize tasks from response content to the Command Center DB
        missionService.parseAndSaveTasksFromChat(userId, content).catch(e => console.error('[Chat] Task sync failed:', e));

        // Optional: Post to Moltbook if strategic alignment is high
        if (publish_to_moltbook && (metadata?.production_scores?.overall > 70 || !analyticsRequested)) {
            await postToMoltbook(content, 'zium-nova-briefs');
        }

        const response: ApiResponse = {
            success: true,
            data: {
                conversation_id: convId,
                message: {
                    role: 'nova',
                    content: content,
                    metadata,
                },
            },
            timestamp: new Date().toISOString(),
        };

        res.json(response);
    } catch (error) {
        console.error('[Chat] Error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Internal server error',
            timestamp: new Date().toISOString(),
        };
        res.status(500).json(response);
    }
});

export default router;
