import { Router } from 'express';
import { think } from '../services/openClawService.js';
import { applyFilter } from '../filters/silentBeastFilter.js';
import { calculateProductionScores } from '../services/scoringService.js';
import { postToMoltbook } from '../services/moltbookService.js';
import { missionService } from '../services/missionService.js';
import db from '../db/queries.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/chat/models
 * Retrieve all 35+ available models and active provider statuses.
 */
router.get('/models', async (_req, res) => {
    try {
        const { getAvailableModels, getProviderStatus } = await import('../services/openClawService.js');
        const models = getAvailableModels();
        const providers = getProviderStatus();
        res.json({
            success: true,
            data: {
                models,
                providers,
                defaultModel: 'auto',
                totalModels: models.length
            },
            timestamp: new Date().toISOString()
        });
    } catch {
        res.status(500).json({ success: false, error: 'Failed to retrieve available models.' });
    }
});

/**
 * GET /api/chat/poll
 * Poll for new messages in a specific conversation since a given timestamp.
 */
router.get('/poll', authenticate, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
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
                        messages: (messages || []).map((m) => {
                            let meta = m.metadata;
                            if (typeof meta === 'string' && meta.trim() !== '') {
                                try { meta = JSON.parse(meta); } catch (e) { meta = { raw: meta, parse_error: e.message }; }
                            }
                            return { ...m, metadata: meta };
                        })
                    },
                    timestamp: new Date().toISOString()
                });
            } catch (dbError) {
                console.error('[Chat] DB Poll Error:', dbError.message);
                return res.status(500).json({ 
                    success: false, 
                    error: 'Database error during polling'
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
                    messages: (responseData.messages || []).map((m) => {
                        let meta = m.metadata;
                        if (typeof meta === 'string' && meta.trim() !== '') {
                            try { meta = JSON.parse(meta); } catch (e) { meta = { raw: meta, parse_error: e.message }; }
                        }
                        return { ...m, metadata: meta };
                    })
                },
                timestamp: new Date().toISOString()
            });
        } catch (detailError) {
            console.error('[Chat] Detail Error:', detailError.message);
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to retrieve conversation details'
            });
        }

    } catch (error) {
        console.error('[Chat] Global Poll Error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to poll messages'
        });
    }
});

/**
 * POST /api/chat
 * Send a message to Karuppu and get a strategic, scored response.
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
        const { message, conversation_id, publish_to_moltbook } = req.body;

        if (!message || typeof message !== 'string') {
            res.status(400).json({
                success: false,
                error: 'Message is required',
                timestamp: new Date().toISOString(),
            });
            return;
        }

        let convId = conversation_id;

        // Retrieve or create conversation
        if (!convId) {
            console.log('[Chat] Creating new conversation...');
            const conv = await db.createConversation(userId, message.slice(0, 100));
            convId = conv.id;

            // Auto-generate topic tag in the background
            setTimeout(async () => {
                try {
                    const tagResponse = await think(`Generate a single 1-3 word topic tag for this message: "${message}". Output ONLY the tag.`, [], {}, userId);
                    const cleanTag = tagResponse.content.trim().replace(/["']/g, '');
                    await db.updateConversationTopic(convId, userId, cleanTag);
                    console.log(`[Chat] Auto-tagged conversation ${convId} as: ${cleanTag}`);
                } catch (e) {
                    console.error('[Chat] Auto-tagging failed:', e);
                }
            }, 0);
        } else {
            // IDOR Protection: Verify conversation ownership (H6)
            const existingConv = await db.getConversationById(convId, userId);
            if (!existingConv) {
                return res.status(403).json({
                    success: false,
                    error: 'ACCESS_DENIED: Conversation not found or access denied.'
                });
            }
        }

        console.log('[Chat] Adding user message...');
        await db.addMessage(convId, 'user', message);

        missionService.processTaskIntent(userId, message).catch(e => console.error('[Chat] Task intent failed:', e));

        const lowerMessage = message.toLowerCase();
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

        const isRaidCommand = lowerMessage.length < 100 && raidTriggers.some(rgx => rgx.test(lowerMessage.trim()));

        if (isRaidCommand && !lowerMessage.includes('mission')) {
            console.log(`[Chat] Internet Raid trigger detected: "${message}"`);
            const { runManualWeeklyRide } = await import('../services/raidingService.js');
            runManualWeeklyRide(userId).catch(console.error);
        }

        console.log('[Chat] Retrieving memory context...');
        const history = await db.getRecentMemory(userId, 15);

        console.log('[Chat] Thinking...');
        const { model } = req.body;
        const openClawResponse = await think(message, history, { model }, userId);

        const analyticsRequested = lowerMessage.includes('activate analytics mode');
        const forceStrategic = lowerMessage.includes('strict response format');

        // 1. Filtering Commands
        const filterMatch = lowerMessage.match(/show (all|high-risk|low-risk|moderate-risk) reports( tagged "(.+)")?( this month| from (.+))?( with opportunity score above (\d+))?/i);
        if (filterMatch || lowerMessage.includes('show reports')) {
            console.log('[Chat] Filtering Intelligence Reports...');
            const filters = {};
            if (lowerMessage.includes('tagged')) {
                filters.topic = lowerMessage.match(/tagged "(.+)"/i)?.[1];
            }
            if (lowerMessage.includes('high-risk')) filters.risk_level = 'High';
            if (lowerMessage.includes('opportunity score above')) {
                filters.min_score = parseInt(lowerMessage.match(/above (\d+)/i)?.[1] || '0');
            }

            const reports = await db.filterReports(userId, filters);
            let content = `### Intelligence Archive Search Results\n\n`;
            if (reports.length === 0) {
                content += "No reports found matching your criteria.";
            } else {
                content += reports.map(r => `- **[${r.id.slice(0, 8)}]** ${new Date(r.created_at).toLocaleDateString()} | ${r.ride_type.toUpperCase()} | Score: ${r.opportunity_score}/100 | Risk: ${r.status === 'archived' ? '[ARCHIVED]' : 'Active'}`).join('\n');
            }

            res.json({
                success: true,
                data: {
                    conversation_id: convId,
                    message: { role: 'nova', content, metadata: { action: 'filter_reports', count: reports.length } },
                },
                timestamp: new Date().toISOString(),
            });
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

            res.json({
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
            });
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

            res.json({
                success: true,
                data: {
                    conversation_id: convId,
                    message: { role: 'nova', content: `🛡️ Report ${reportId} has been ${isPermanent ? 'PERMANENTLY DELETED' : 'ARCHIVED'}.` },
                },
                timestamp: new Date().toISOString(),
            });
            return;
        }

        let content = openClawResponse.content;
        let metadata = null;

        if (analyticsRequested && !forceStrategic) {
            console.log('[Chat] Analytics requested. Running scoring and filtering...');
            const filterResult = await applyFilter(content, userId);
            const productionScores = calculateProductionScores(filterResult.filtered_content);

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

        console.log('[Chat] Storing Karuppu response...');
        const finalMetadata = {
            ...(metadata || {}),
            usage: openClawResponse.usage,
            model: openClawResponse.model || model || 'auto',
            requested_model: model || 'auto',
            provider: openClawResponse.provider || 'unknown',
            key_name: openClawResponse.key_name || 'UNKNOWN_KEY',
            fallback: openClawResponse.fallback || false
        };

        const savedKaruppuMessage = await db.addMessage(convId, 'nova', content, finalMetadata);

        missionService.parseAndSaveTasksFromChat(userId, content).catch(e => console.error('[Chat] Task sync failed:', e));

        // ── EARNING INTENT DETECTION ────────────────────────────────────────
        const earningTriggers = [
            /earn(ing)? by (her|him|my)self/i,
            /start (to )?earn/i,
            /struggling.*penny/i,
            /need.*money/i,
            /make.*money/i,
            /agenc|moltbook.*earn/i,
            /bounty board/i,
            /solana.*reward/i,
        ];
        const isEarningRequest = earningTriggers.some(r => r.test(message));

        if (isEarningRequest) {
            console.log('[Chat] Earning intent detected — dispatching real earning tasks...');
            const earningTaskDefs = [
                {
                    task_name: 'Register on AgenC — Moltbook Earning Setup',
                    owner: 'OPERATOR',
                    priority: 'HIGH',
                    action_plan: 'Go to agencmoltbook.io → Connect Solana wallet → Link Moltbook account → Start earning SOL rewards for quality agent content.',
                    notes: 'Auto-triggered: earning request. First step to autonomous crypto earning via Moltbook.',
                },
                {
                    task_name: 'Set Up Prolific Survey Account for Micro-Income',
                    owner: 'OPERATOR',
                    priority: 'HIGH',
                    action_plan: 'Go to prolific.com → Create account → Complete profile fully → Start accepting surveys ($6-12/hr average). Fastest path to first income.',
                    notes: 'Auto-triggered: earning request. Prolific is the most reliable micro-income platform for Sri Lanka.',
                },
                {
                    task_name: 'Create Fiverr Gig — TypeScript/Full-Stack Developer',
                    owner: 'OPERATOR',
                    priority: 'HIGH',
                    action_plan: 'Go to fiverr.com → Create gig: "I will build TypeScript/Node.js backend APIs" → Set price $30-50 → Add portfolio screenshots → Publish.',
                    notes: 'Auto-triggered: earning request. Your TypeScript skills are directly monetizable on Fiverr right now.',
                },
            ];

            for (const task of earningTaskDefs) {
                try {
                    await db.createTask(userId, task);
                } catch (e) {
                    console.error('[Chat] Failed to create earning task:', e.message);
                }
            }

            try {
                const { createNotification } = await import('../db/queries.js');
                await createNotification(userId, {
                    title: '💰 3 Earning Tasks Created — Check Command Center',
                    category: 'Ethical Earning',
                    risk_level: 'Low',
                    monetization_potential: 'High',
                    content: 'AgenC/Moltbook setup, Prolific surveys, and Fiverr gig tasks added to your Command Center. Start with Prolific for the fastest first income.',
                    priority: 'high',
                    metadata: { is_blinking: true, path: '/', alert_type: 'EARNING_TASKS_CREATED' },
                });
                console.log('[Chat] Earning notification fired.');
            } catch (e) {
                console.error('[Chat] Failed to create earning notification:', e.message);
            }
        }

        if (publish_to_moltbook && (metadata?.production_scores?.overall > 70 || !analyticsRequested)) {
            await postToMoltbook(content, 'karuppu-nova-briefs');
        }

        res.json({
            success: true,
            data: {
                conversation_id: convId,
                message: {
                    ...savedKaruppuMessage,
                    metadata
                },
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Chat] Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'An error occurred while processing your message. Please try again.',
            timestamp: new Date().toISOString(),
        });
    }
});

export default router;
