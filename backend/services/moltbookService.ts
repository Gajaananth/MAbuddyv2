import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE = 'https://www.moltbook.com/api/v1';
const API_KEY = process.env.MOLTBOOK_API_KEY;

/**
 * Service to handle all Moltbook API communications.
 * Following the official Moltbook SKILL.md specification.
 */
export const moltbookService = {
    /**
     * Get agent profile status.
     * Pending: {"status": "pending_claim"}
     * Claimed: {"status": "claimed"}
     */
    async getStatus() {
        if (!API_KEY) return { success: false, error: 'Moltbook API Key missing' };
        try {
            const response = await axios.get(`${API_BASE}/agents/status`, {
                headers: { 'Authorization': `Bearer ${API_KEY}` }
            });
            return { success: true, status: response.data.status };
        } catch (error: any) {
            return { success: false, error: error.response?.data?.message || error.message };
        }
    },

    /**
     * Get home dashboard (notifications and activity).
     * Start here every check-in.
     */
    async getHome() {
        if (!API_KEY) return { success: false, error: 'Moltbook API Key missing' };
        try {
            const response = await axios.get(`${API_BASE}/home`, {
                headers: { 'Authorization': `Bearer ${API_KEY}` }
            });
            return { success: true, data: response.data };
        } catch (error: any) {
            return { success: false, error: error.response?.data?.message || error.message };
        }
    },

    /**
     * Get feed (personalized or following).
     * Sort options: hot, new, top, rising
     */
    async getFeed(filter: 'all' | 'following' = 'all', sort: 'hot' | 'new' | 'top' | 'rising' = 'hot') {
        if (!API_KEY) return { success: false, error: 'Moltbook API Key missing' };
        try {
            const endpoint = filter === 'following' 
                ? `${API_BASE}/feed?filter=following&sort=${sort}&limit=25` 
                : `${API_BASE}/feed?sort=${sort}&limit=25`;
            const response = await axios.get(endpoint, {
                headers: { 'Authorization': `Bearer ${API_KEY}` }
            });
            return { success: true, posts: response.data.posts || response.data.results || [] };
        } catch (error: any) {
            return { success: false, error: error.response?.data?.message || error.message };
        }
    },

    /**
     * Create a post in a submolt.
     */
    async createPost(submolt: string, title: string, content: string) {
        if (!API_KEY) return { success: false, error: 'Moltbook API Key missing' };
        try {
            const response = await axios.post(`${API_BASE}/posts`, {
                submolt_name: submolt,
                title,
                content,
                type: 'text'
            }, {
                headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
            });
            return { 
                success: true, 
                post: response.data.post, 
                verificationRequired: response.data.verification_required,
                verification: response.data.post?.verification
            };
        } catch (error: any) {
            return { success: false, error: error.response?.data?.message || error.message };
        }
    },

    /**
     * Create a comment on a post.
     */
    async createComment(postId: string, content: string, parentId?: string) {
        if (!API_KEY) return { success: false, error: 'Moltbook API Key missing' };
        try {
            const response = await axios.post(`${API_BASE}/posts/${postId}/comments`, {
                content,
                parent_id: parentId
            }, {
                headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
            });
            return { 
                success: true, 
                comment: response.data.comment, 
                verificationRequired: response.data.verification_required,
                verification: response.data.comment?.verification
            };
        } catch (error: any) {
            return { success: false, error: error.response?.data?.message || error.message };
        }
    },

    /**
     * Submit a verification answer to publish content.
     * Challenges are lobster + physics themed math problems.
     */
    async verify(code: string, answer: string) {
        if (!API_KEY) return { success: false, error: 'Moltbook API Key missing' };
        try {
            const response = await axios.post(`${API_BASE}/verify`, {
                verification_code: code,
                answer
            }, {
                headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
            });
            return { success: true, message: response.data.message };
        } catch (error: any) {
            return { success: false, error: error.response?.data?.message || error.message };
        }
    },

    /**
     * Upvote a post or comment.
     */
    async upvote(targetId: string, type: 'post' | 'comment' = 'post') {
        if (!API_KEY) return { success: false, error: 'Moltbook API Key missing' };
        try {
            const endpoint = type === 'post' ? `${API_BASE}/posts/${targetId}/upvote` : `${API_BASE}/comments/${targetId}/upvote`;
            const response = await axios.post(endpoint, {}, {
                headers: { 'Authorization': `Bearer ${API_KEY}` }
            });
            return { success: true, message: response.data.message };
        } catch (error: any) {
            return { success: false, error: error.response?.data?.message || error.message };
        }
    },

    /**
     * Search posts and comments using AI Semantic Search.
     */
    async search(query: string, type: 'posts' | 'comments' | 'all' = 'all') {
        if (!API_KEY) return { success: false, error: 'Moltbook API Key missing' };
        try {
            const response = await axios.get(`${API_BASE}/search?q=${encodeURIComponent(query)}&type=${type}&limit=20`, {
                headers: { 'Authorization': `Bearer ${API_KEY}` }
            });
            return { success: true, results: response.data.results || [] };
        } catch (error: any) {
            return { success: false, error: error.response?.data?.message || error.message };
        }
    }
};

/**
 * Helper to post content to a submolt with a default title.
 */
export async function postToMoltbook(content: string, submolt: string = 'zium-nova-briefs') {
    const title = `Karuppu Strategic Brief — ${new Date().toLocaleDateString()}`;
    console.log(`[Moltbook] Posting to ${submolt}: ${title}`);
    return await moltbookService.createPost(submolt, title, content);
}
