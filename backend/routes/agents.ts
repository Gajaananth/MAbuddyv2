import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/queries.js';
import { ApiResponse } from '../types/index.js';

const router = Router();

// In-memory fallback
let agentStore: any[] = [
    {
        id: uuidv4(),
        name: 'Zium Nova',
        trust_score: 95,
        capabilities: ['market-analysis', 'trend-detection', 'scam-exposure', 'strategy-generation'],
        status: 'active',
        description: 'Silent Beast. Strategic AI agent focused on ethical marketing and truth exposure.',
        created_at: new Date(),
    },
];

/**
 * GET /api/agents
 * List all agents in the network.
 */
router.get('/', async (_req: Request, res: Response) => {
    try {
        let agents;
        try {
            agents = await db.getAgents();
            if (agents.length === 0) {
                // Seed Zium Nova as the first agent
                await db.addAgent(
                    'Zium Nova',
                    'Silent Beast. Strategic AI agent focused on ethical marketing and truth exposure.',
                    ['market-analysis', 'trend-detection', 'scam-exposure', 'strategy-generation']
                );
                await db.updateAgentTrustScore((await db.getAgents())[0].id, 95);
                agents = await db.getAgents();
            }
        } catch {
            agents = agentStore;
        }

        const response: ApiResponse = {
            success: true,
            data: agents,
            timestamp: new Date().toISOString(),
        };

        res.json(response);
    } catch (error) {
        console.error('[Agents] Error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Internal server error',
            timestamp: new Date().toISOString(),
        };
        res.status(500).json(response);
    }
});

/**
 * POST /api/agents
 * Register a new agent in the network.
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, description, capabilities } = req.body;

        if (!name || typeof name !== 'string') {
            const response: ApiResponse = {
                success: false,
                error: 'Agent name is required',
                timestamp: new Date().toISOString(),
            };
            res.status(400).json(response);
            return;
        }

        let agent;
        try {
            agent = await db.addAgent(
                name,
                description || '',
                capabilities || []
            );
        } catch {
            agent = {
                id: uuidv4(),
                name,
                trust_score: 50,
                capabilities: capabilities || [],
                status: 'active',
                description: description || '',
                created_at: new Date(),
            };
            agentStore.push(agent);
        }

        const response: ApiResponse = {
            success: true,
            data: agent,
            timestamp: new Date().toISOString(),
        };

        res.status(201).json(response);
    } catch (error) {
        console.error('[Agents] Error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Internal server error',
            timestamp: new Date().toISOString(),
        };
        res.status(500).json(response);
    }
});

/**
 * POST /api/agents/:id/initiate
 * Initiate a strategic collaboration with a verified agent.
 */
router.post('/:id/initiate', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        // Update database collaboration timestamp
        try {
            await db.updateAgentCollaboration(id);
            await db.logAgentActivity({
                agent_id: 'NOVA',
                action_type: 'AGENT_COLLABORATION',
                platform: 'INTERNAL',
                details: `Strategic initiation with agent ${id} confirmed.`
            });
        } catch {
            // Fallback for in-memory
            const agent = agentStore.find(a => a.id === id);
            if (agent) agent.last_collaboration = new Date();
        }

        res.json({
            success: true,
            message: 'Strategic collaboration protocol initiated. Nova is now syncing with this agent.',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to initiate agent' });
    }
});

export default router;
