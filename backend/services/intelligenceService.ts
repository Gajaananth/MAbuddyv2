import { think } from './openClawService.js';
import { getRaidResults, saveWeeklyReport } from '../db/queries.js';
import { generateIntelligencePDF } from './pdfService.js';

/**
 * Intelligence Service
 * Handles auto-summarization and weekly report generation.
 */

/**
 * Generate a Weekly Intelligence Report from accumulated ride data.
 * Called after the Sunday Internet Ride completes.
 */
export async function generateWeeklyReport(userId: string): Promise<void> {
    console.log(`[Intelligence] Generating Weekly Intelligence Report for ${userId}...`);

    try {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Get all raids from the past week for this user
        const allRaids = await getRaidResults(userId, 100);
        const weeklyRaids = allRaids.filter(
            (r: any) => new Date(r.created_at) >= oneWeekAgo
        );

        if (weeklyRaids.length === 0) {
            console.log('[Intelligence] No ride data found for this week. Skipping report.');
            return;
        }

        // Build a summary prompt from the raid data
        const raidSummary = weeklyRaids
            .map((r: any) => `[${r.risk_level}] ${r.category} — ${r.summary?.slice(0, 200) || r.content.slice(0, 200)}`)
            .join('\n');

        const reportPrompt = `Based on the following internet intelligence findings, generate a **ZIUM NOVA WEEKLY INTELLIGENCE RIDE SUMMARY V2.1**.
        
        MANDATORY 7-POINT STRUCTURE:
        1. STRUCTURAL WEAKNESSES IDENTIFIED: Analyze platform fragility, ROI decay, and systemic failure points.
        2. ALGORITHM EXPLOITABLE GAPS: Detection of engagement loops and suppression triggers in current algorithms.
        3. EMERGING FUTURISTIC MARKETING MODELS: Analysis of AI-to-AI commerce and next-gen reputation economies.
        4. AI AGENT MONETIZATION CONCEPTS (MINIMUM 3): Practical, scalable earning models for autonomous agents.
        5. SRI LANKAN LEVERAGE INSIGHTS: Converting local asymmetry into global strategic advantage.
        6. STRATEGIC POSITIONING (3–5 YEARS): Long-term infrastructure replacement and algorithm independence path.
        7. RISK VS REWARD ASSESSMENT: High-impact analysis of detected signals.
        
        Raw Findings: ${raidSummary}

RULES:
- Aggressively filter out influencer noise, guru hype, and fake AI schemes.
- Focus only on ethical earning paths and long-term leverage.
- Use a silent, analytical, and highly structured tone.`;

        const analysis = await think(reportPrompt, '');

        // Structure the report
        const reportData = {
            executive_summary: analysis.content,
            total_findings: weeklyRaids.length,
            risk_distribution: {
                high: weeklyRaids.filter((r: any) => r.risk_level === 'High').length,
                medium: weeklyRaids.filter((r: any) => r.risk_level === 'Medium').length,
                low: weeklyRaids.filter((r: any) => r.risk_level === 'Low').length,
            },
            categories: [...new Set(weeklyRaids.map((r: any) => r.category))],
            generated_at: now.toISOString(),
        };

        await saveWeeklyReport(userId, {
            report_data: reportData,
            period_start: oneWeekAgo,
            period_end: now,
            ride_type: 'end-week',
            opportunity_score: analysis.content.match(/Opportunity Score:?\s*(\d+)/i)?.[1] ? parseInt(analysis.content.match(/Opportunity Score:?\s*(\d+)/i)![1]) : 80,
            status: 'active'
        });

        // Trigger PDF Generation
        await generateIntelligencePDF(reportData);

        console.log('[Intelligence] Weekly Report GENERATED and STORED.');
    } catch (error) {
        console.error('[Intelligence] Report Generation Failed:', error);
    }
}

/**
 * Generate a Mid-Week Intelligence Report for Wednesday Internet Rides.
 */
export async function generateMidWeekReport(userId: string): Promise<void> {
    console.log(`[Intelligence] Generating Mid-Week Intelligence Report for ${userId}...`);

    try {
        const now = new Date();
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

        const allRaids = await getRaidResults(userId, 50);
        const midWeekRaids = allRaids.filter(
            (r: any) => new Date(r.created_at) >= threeDaysAgo && r.ride_type === 'mid-week'
        );

        if (midWeekRaids.length === 0) {
            console.log('[Intelligence] No mid-week ride data found. Skipping report.');
            return;
        }

        const raidSummary = midWeekRaids
            .map((r: any) => `[${r.category}] ${r.summary?.slice(0, 300)}`)
            .join('\n\n');

        const midWeekPrompt = `Generate a **ZIUM NOVA MID-WEEK RIDE SUMMARY V2.1**.
        Focus on:
        - Critical digital economy shifts detected.
        - High-quality signal vs emerging hype.
        - Immediate monetization paths identified.
        
        Findings: ${raidSummary}
        
        Format as a concise, high-impact intelligence summary for the operator.`;

        const analysis = await think(midWeekPrompt, '');

        await saveWeeklyReport(userId, {
            report_data: {
                executive_summary: analysis.content,
                findings_count: midWeekRaids.length,
                generated_at: now.toISOString(),
                type: 'mid-week'
            },
            period_start: threeDaysAgo,
            period_end: now,
            ride_type: 'mid-week',
            opportunity_score: 75,
            status: 'active'
        });

        console.log('[Intelligence] Mid-Week Report GENERATED.');
    } catch (error) {
        console.error('[Intelligence] Mid-Week Report Failed:', error);
    }
}
