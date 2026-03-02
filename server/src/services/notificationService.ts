/**
 * Notification Service — Zium Nova Intelligence Alert System
 * Handles persistent notifications, priority signal detection, push delivery, and strategic alerts.
 */

import { createNotification, getPushSubscriptions } from '../db/queries';
import webpush from 'web-push';
import dotenv from 'dotenv';

dotenv.config();

// ──────────────────────────── Web Push Config ────────────────────────────

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:zium-nova@ziumnova.app';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    console.log('[Push] VAPID keys configured — Push notifications ARMED');
} else {
    console.warn('[Push] VAPID keys missing — Push notifications DISABLED');
}

export function getVapidPublicKey(): string {
    return VAPID_PUBLIC;
}

// ──────────────────────────── Trigger Keywords ────────────────────────────

const STRATEGIC_TRIGGERS = [
    'marketing infrastructure',
    'algorithm structural shift',
    'decentralized reputation',
    'agent earning autonomously',
    'influencer economy collapse',
    'sri lankan stock anomaly',
    'whale inflow',
    'structural shift',
    'first-mover opportunity',
    'moltbook agent',
    'ai-agent ecosystem',
    'stupid influencer',
    'fake authority',
    'futuristic social commerce',
    'deep-scam network',
    'manipulative pattern',
    'pyramid structure',
    'recruitment-based return',
];

const PRIORITY_TRIGGERS = [
    'ethical earning strategy',
    'emerging marketing platform',
    'algorithm weakness',
    'high-value traffic source',
    'bot intelligence opportunity',
    'scam network exposed',
    'sri lankan stock abnormal',
    'autonomous ai agent',
    'decentralized discovery',
    'reputation economy',
    'ai-to-ai commerce',
    'infrastructure replacement',
    'scam detected',
    'manipulation campaign',
    'agent earning pattern',
    'futuristic marketing',
    'platform behavioral trend',
    'cse whale flow',
    'undervalued sector inflow',
    'agentic autonomy',
];

// ──────────────────────────── Detection Engine ────────────────────────────

export interface PriorityAlert {
    whatChanged: string;
    whyItMatters: string;
    actionWindow: string;
    riskAssessment: string;
}

/**
 * Auto-detect critical patterns in raid findings.
 */
export function detectStrategicBreach(findings: string): boolean {
    return STRATEGIC_TRIGGERS.some(key => findings.toLowerCase().includes(key));
}

/**
 * Determine if content contains a priority signal.
 */
export function detectPrioritySignal(content: string): boolean {
    return PRIORITY_TRIGGERS.some(key => content.toLowerCase().includes(key));
}

/**
 * Classify the intelligence category from content.
 */
function classifyCategory(content: string): string {
    const lower = content.toLowerCase();
    if (lower.includes('moltbook') || lower.includes('agent interaction') || lower.includes('agent earning')) return 'AI-Agent Ecosystem';
    if (lower.includes('sri lank') || lower.includes('cse') || lower.includes('colombo')) return 'SL Market Intelligence';
    if (lower.includes('scam') || lower.includes('fraud') || lower.includes('manipulation') || lower.includes('stupid influencer')) return 'Scam Detection';
    if (lower.includes('algorithm') || lower.includes('engagement') || lower.includes('suppression')) return 'Algorithm Analysis';
    if (lower.includes('earning') || lower.includes('monetiz') || lower.includes('profit')) return 'Ethical Earning';
    if (lower.includes('ai agent') || lower.includes('autonomous') || lower.includes('bot')) return 'AI Agent Intelligence';
    if (lower.includes('marketing') || lower.includes('platform') || lower.includes('traffic')) return 'Marketing Intelligence';
    return 'Strategic Intelligence';
}

/**
 * Assess monetization potential from content.
 */
function assessMonetization(content: string): string {
    const lower = content.toLowerCase();
    if (lower.includes('high-value') || lower.includes('breakthrough') || lower.includes('first-mover')) return 'High';
    if (lower.includes('low risk') || lower.includes('stable') || lower.includes('gradual')) return 'Low';
    return 'Medium';
}

/**
 * Assess risk level from content.
 */
function assessRisk(content: string): 'Low' | 'Medium' | 'High' {
    const lower = content.toLowerCase();
    if (lower.includes('high risk') || lower.includes('critical') || lower.includes('urgent') || lower.includes('flag')) return 'High';
    if (lower.includes('low risk') || lower.includes('stable')) return 'Low';
    return 'Medium';
}

// ──────────────────────────── Push Delivery ────────────────────────────

/**
 * Send a push notification to all registered devices for a user.
 */
export async function sendPushToUser(
    userId: string,
    payload: { title: string; body: string; tag?: string; data?: any }
): Promise<void> {
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

    try {
        const subscriptions = await getPushSubscriptions(userId);
        if (!subscriptions.length) return;

        const payloadStr = JSON.stringify(payload);

        const results = await Promise.allSettled(
            subscriptions.map(sub => webpush.sendNotification(sub, payloadStr))
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        if (successful > 0) {
            console.log(`[Push] Delivered to ${successful}/${subscriptions.length} devices for user ${userId}`);
        }
        if (failed > 0) {
            console.warn(`[Push] ${failed} delivery failures for user ${userId}`);
        }
    } catch (err) {
        console.error('[Push] Delivery error:', err);
    }
}

// ──────────────────────────── Notification Creation ────────────────────────────

/**
 * Evaluate raid/analysis content and create a notification if it meets significance thresholds.
 * Also triggers push notification delivery to all registered devices.
 */
export async function evaluateAndNotify(
    userId: string,
    content: string,
    title: string
): Promise<void> {
    const isStrategic = detectStrategicBreach(content);
    const isPriority = detectPrioritySignal(content);

    // Only notify for significant findings
    if (!isStrategic && !isPriority) return;

    const category = classifyCategory(content);
    const monetization = assessMonetization(content);
    const risk = assessRisk(content);
    const priority = isPriority ? 'critical' : (isStrategic ? 'high' : 'normal');

    // Truncate content for notification (keep it strategic, not verbose)
    const truncated = content.length > 500 ? content.slice(0, 497) + '...' : content;
    const notifTitle = isPriority ? `🔴 PRIORITY SIGNAL: ${title}` : `📡 ${title}`;

    try {
        await createNotification(userId, {
            title: notifTitle,
            category,
            risk_level: risk,
            monetization_potential: monetization,
            content: truncated,
            priority: priority as 'normal' | 'high' | 'critical',
        });

        // Send push notification to all registered devices
        await sendPushToUser(userId, {
            title: notifTitle,
            body: truncated.slice(0, 200),
            tag: `zn-${category.toLowerCase().replace(/\s+/g, '-')}`,
            data: { category, risk, priority, url: '/' },
        });

        console.log(`[Notification] ${priority.toUpperCase()} signal stored + pushed for user ${userId}: ${title}`);
    } catch (err) {
        console.error('[Notification] Failed to persist:', err);
    }
}

/**
 * Legacy console-based notification for server logs.
 */
export function notifyStrategicSignal(alert: PriorityAlert) {
    console.log('\n' + '='.repeat(60));
    console.log('🚨 PRIORITY NOTIFICATION PROTOCOL — SILENT BEAST');
    console.log('='.repeat(60));
    console.log(`WHAT CHANGED:   ${alert.whatChanged}`);
    console.log(`WHY IT MATTERS: ${alert.whyItMatters}`);
    console.log(`ACTION WINDOW:  ${alert.actionWindow}`);
    console.log(`RISK LEVEL:     ${alert.riskAssessment}`);
    console.log('='.repeat(60) + '\n');
}

