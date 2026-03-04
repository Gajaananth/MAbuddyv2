import { think } from './openClawService';
import { getRaidResults, saveWeeklyReport } from '../db/queries';
import { generateIntelligencePDF } from './pdfService';

/**
 * Intelligence Service
 * Handles auto-summarization and weekly report generation.
 */

/**
 * Generate a Weekly Intelligence Report from accumulated raid data.
 * Called after the Sunday raid completes.
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
            console.log('[Intelligence] No raid data found for this week. Skipping report.');
            return;
        }

        // Build a summary prompt from the raid data
        const raidSummary = weeklyRaids
            .map((r: any) => `[${r.risk_level}] ${r.category} — ${r.summary?.slice(0, 200) || r.content.slice(0, 200)}`)
            .join('\n');

        const reportPrompt = `Based on the following internet intelligence findings, generate a **SILENT BEAST DOMINANCE REPORT V2**.
        
        MANDATORY STRUCTURE:
        1. Structural Weaknesses Identified: Analyze platform fragility and ROI decay.
        2. Algorithm Exploitable Gaps: Engagement loops and suppression triggers.
        3. Emerging Futuristic Marketing Models: AI-to-AI commerce and reputation economies.
        4. AI Agent Monetization Concepts (MINIMUM 3): Practical earning models for agents.
        5. Sri Lankan Leverage Insights: Local asymmetry converted to global advantage.
        6. 3–5 Year Strategic Positioning: Long-term infrastructure replacement path.
        7. Risk vs Reward Assessment: High-impact analysis.
        
        Raw Findings: ${raidSummary}

RULES:
- No repetition. No generic statements. No influencer worship.
- Every insight must connect to earning potential or strategic positioning.
- Use a silent, analytical, and sharp tone.`;

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
