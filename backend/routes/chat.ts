import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { think } from '../services/openClawService.js';
import { applyFilter } from '../filters/silentBeastFilter.js';
import { calculateProductionScores } from '../services/scoringService.js';
import { postToMoltbook } from '../services/moltbookService.js';
import { missionService } from '../services/missionService.js';
import db from '../db/queries.js';
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
        
        if (since && typeof since === 'string' && since.trim() !== '') {
            try {
                const messages = await db.getMessagesSince(conversation_id, userId, since);
                return res.json({
                    success: true,
                    data: {
                        messages: (messages || []).map(m => {
                            let meta = m.metadata;
                            if (typeof meta === 'string' && meta.trim() !== '') {
                                try { meta = JSON.parse(meta); } catch (e) { meta = { raw: meta, parse_error: e.message }; }
                            }
                            return { ...m, metadata: meta };
                        })
                    },
                    timestamp: new Date().toISOString()
                });
            } catch (dbError: any) {
                console.error('[Chat] DB Poll Error:', dbError);
                return res.status(500).json({ 
                    success: false, 
                    error: 'Database error during polling', 
                    detail: dbError.message,
                    stack: dbError.stack
                });
            }
        }
        
        // Fallback or Initial Load (No 'since' provided)
        try {
            const responseData = await db.getConversationDetail(conversation_id, userId);
            
            if (!responseData) {
                return res.status(404).json({ success: false, error: 'Conversation not found' });
            }

            res.json({
                success: true,
                data: {
                    messages: (responseData.messages || []).map((m: any) => {
                        let meta = m.metadata;
                        if (typeof meta === 'string' && meta.trim() !== '') {
                            try { meta = JSON.parse(meta); } catch (e) { meta = { raw: meta, parse_error: e.message }; }
                        }
                        return { ...m, metadata: meta };
                    })
                },
                timestamp: new Date().toISOString()
            });
        } catch (detailError: any) {
            console.error('[Chat] Detail Error:', detailError);
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to retrieve conversation details',
                detail: detailError.message
            });
        }

    } catch (error: any) {
        console.error('[Chat] Global Poll Error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to poll messages',
            detail: error.message,
            stack: error.stack
        });
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
        // --- Internet Raid Recognition (LOG ONLY, AI HANDLES RESPONSE) ---
        const raidTriggers = [
            /^weekly ride/i,
            /^run weekly ride/i,
            /^internet raid/i,
            /^internet ride/i,
            /^run raid/i,
            /^start ride/i,
            /^start raid/i,
            /^execute raid/i,
            /^raid$/i
        ];

        const isRaidCommand = lowerMessage.length < 100 && raidTriggers.some(rgx => (rgx as RegExp).test(lowerMessage.trim()));
        
        if (isRaidCommand && !lowerMessage.includes('mission')) {
            console.log(`[Chat] Internet Raid trigger detected: "${message}"`);
            const { runManualWeeklyRide } = await import('../services/raidingService.js');
            runManualWeeklyRide(userId).catch(console.error);
            // No return here - let the AI think and respond normally
        }

        console.log('[Chat] Retrieving memory context...');
        // Retrieve memory context for RAG
        memoryContext = await db.getRecentMemoryContext(userId, convId, 15);

        console.log('[Chat] Thinking...');
        // Send to Zium Nova's brain (Groq / Gemini / OpenAI)
        const { model } = req.body;
        const openClawResponse = await think(message, memoryContext, { model }, userId);

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
            const filterResult = await applyFilter(content, userId);

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
        // Merge token usage and model into metadata for tracking
        const finalMetadata = {
            ...(metadata || {}),
            usage: openClawResponse.usage,
            model: model || 'llama-3.3-70b-versatile'
        };
        // Store Nova's response
        const savedNovaMessage = await db.addMessage(convId, 'nova', content, finalMetadata);

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
                    ...savedNovaMessage,
                    metadata // Ensure processed metadata is included if it exists
                },
            },
            timestamp: new Date().toISOString(),
        };

        res.json(response);
    } catch (error: any) {
        console.error('[Chat] Error:', error);
        const response: ApiResponse & { stack?: string, detail_message?: string } = {
            success: false,
            error: error.message || 'Internal server error',
            detail_message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
        };
        res.status(500).json(response);
    }
});

export default router;
