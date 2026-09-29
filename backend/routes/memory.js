import { Router } from 'express';
import db from '../db/queries.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();
/**
 * GET /api/memory/conversations
 * List recent conversations for the authenticated user.
 */
router.get('/conversations', authenticate, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const limit = parseInt(req.query.limit || '20', 10);
        const offset = parseInt(req.query.offset || '0', 10);
        const includeDeleted = req.query.include_deleted === 'true';
        let conversations;
        try {
            conversations = await db.getConversations(userId, limit, offset, includeDeleted);
        }
        catch (error) {
            console.error('[Memory] DB Error:', error);
            conversations = [];
        }
        const response = {
            success: true,
            data: conversations,
            timestamp: new Date().toISOString(),
        };
        res.json(response);
    }
    catch (error) {
        console.error('[Memory] Error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
/**
 * GET /api/memory/unread-count
 * Get count of unread messages from Karuppu.
 */
router.get('/unread-count', authenticate, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        const count = await db.getUnreadMessageCount(userId);
        res.json({ success: true, count });
    }
    catch (error) {
        console.error('[Memory] Unread Count Error:', error);
        res.status(500).json({ success: false, error: 'Failed' });
    }
});
/**
 * POST /api/memory/conversations/:id/read
 * Mark all messages in a conversation as read.
 */
router.post('/conversations/:id/read', authenticate, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        const id = req.params.id;
        await db.markMessagesRead(id);
        res.json({ success: true, message: 'Messages marked read' });
    }
    catch (error) {
        console.error('[Memory] Mark Read Error:', error);
        res.status(500).json({ success: false, error: 'Failed' });
    }
});
/**
 * POST /api/memory/read-all
 * Mark all messages across all conversations as read for the user.
 */
router.post('/read-all', authenticate, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        await db.markAllMessagesRead(userId);
        res.json({ success: true, message: 'All messages marked as read' });
    }
    catch (error) {
        console.error('[Memory] Mark All Read Error:', error);
        res.status(500).json({ success: false, error: 'Failed' });
    }
});
/**
 * GET /api/memory/conversations/:id
 * Get a full conversation with messages, restricted to owner.
 */
router.get('/conversations/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        const id = req.params.id;
        let conversation;
        let messages;
        try {
            conversation = await db.getConversationById(id, userId);
            messages = await db.getMessages(id);
        }
        catch {
            conversation = null;
            messages = [];
        }
        if (!conversation) {
            return res.status(404).json({ success: false, error: 'Conversation not found or access denied' });
        }
        const response = {
            success: true,
            data: { conversation, messages },
            timestamp: new Date().toISOString(),
        };
        res.json(response);
    }
    catch (error) {
        console.error('[Memory] Error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
/**
 * GET /api/memory/search
 * Search conversations by keyword for the authenticated user.
 */
router.get('/search', authenticate, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        const query = req.query.q;
        const limit = parseInt(req.query.limit || '20', 10);
        if (!query) {
            return res.status(400).json({ success: false, error: 'Search query is required' });
        }
        const results = await db.searchConversations(userId, query, limit);
        res.json({ success: true, data: results, timestamp: new Date().toISOString() });
    }
    catch (error) {
        console.error('[Memory] Search Error:', error);
        res.status(500).json({ success: false, error: 'Search failed' });
    }
});
/**
 * PATCH /api/memory/conversations/:id
 * Update a conversation title.
 */
router.patch('/conversations/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        const id = req.params.id;
        const { title } = req.body;
        if (!title || typeof title !== 'string') {
            return res.status(400).json({ success: false, error: 'Title is required' });
        }
        await db.updateConversationTitle(id, userId, title);
        res.json({ success: true, message: 'Title updated', timestamp: new Date().toISOString() });
    }
    catch (error) {
        console.error('[Memory] Update Error:', error);
        res.status(500).json({ success: false, error: 'Update failed' });
    }
});
/**
 * DELETE /api/memory/conversations/:id
 * Soft or permanent delete a conversation.
 */
router.delete('/conversations/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        const id = req.params.id;
        const permanent = req.query.permanent === 'true';
        await db.deleteConversation(id, userId, permanent);
        res.json({
            success: true,
            message: permanent ? 'Permanently deleted' : 'Soft deleted',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('[Memory] Delete Error:', error);
        res.status(500).json({ success: false, error: 'Delete failed' });
    }
});
export default router;
