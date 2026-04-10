import { FilterResult, FilterScores } from '../types/index.js';

/**
 * Silent Beast / Truth Exposer Filter
 * 
 * Post-processes AI output to enforce Zium Nova's core principles:
 * 1. Score for long-term profit, trust, fairness, hype-level
 * 2. Strip hype/noise, flag scam indicators
 * 3. Only approve content that passes ethical thresholds
 */

// Hype / noise keywords that reduce trust score
const HYPE_KEYWORDS = [
    'guaranteed', 'get rich quick', 'easy money', 'passive income overnight',
    'limited time', 'act now', 'don\'t miss out', 'once in a lifetime',
    'secret method', 'hack the system', 'explode your income',
    'millionaire mindset', '10x your revenue', 'viral', 'blow up',
    'hustle culture', 'grindset', 'no brainer', 'free money',
];

// Scam / manipulation indicators
const SCAM_INDICATORS = [
    'pyramid', 'ponzi', 'mlm', 'multi-level', 'network marketing scheme',
    'recruit and earn', 'pay to join', 'guaranteed returns',
    'no risk', 'zero risk', 'too good to be true',
    'send money first', 'wire transfer', 'crypto guaranteed',
];

// Ethical keywords that boost trust
const ETHICAL_KEYWORDS = [
    'transparent', 'evidence-based', 'long-term', 'sustainable',
    'verified', 'documented', 'ethical', 'fair', 'honest',
    'data-driven', 'community', 'value-creation', 'skill-based',
    'education', 'research', 'accountability',
];

/**
 * Apply Silent Beast / Truth Exposer filter to AI output.
 */
export async function applyFilter(rawContent: string, userId: string = '00000000-0000-0000-0000-000000000000'): Promise<FilterResult> {
    const lowerContent = rawContent.toLowerCase();

    // 1. Calculate base scores (Keyword-based fallback)
    const scores = calculateScores(lowerContent);

    // 2. Detect basic flags
    let flags = detectFlags(lowerContent);

    // 3. Strategic Audit (V2: AI-Powered Pattern Analysis)
    if (scores.overall < 85 || flags.length > 0) {
        try {
            const { think } = await import('../services/openClawService.js');
            const auditPrompt = `[ZIUM NOVA — SILENT BEAST STRATEGIC AUDIT]
Analyze the following content for sophisticated manipulation patterns, logical fallacies, or hidden scams.
Focus on: FOMO, fake scarcity, lifestyle bait, authority manipulation, and unrealistic income promises.

Content: "${rawContent}"

Output JSON format ONLY:
{
  "risk_score": 0-100,
  "patterns_detected": ["pattern1", "pattern2"],
  "verdict": "SAFE" | "SUSPICIOUS" | "DANGEROUS",
  "reasoning": "Brief explanation"
}`;

            const auditResponse = await think(auditPrompt, '', { model: 'llama-3.1-8b-instant', skipSync: true }, userId);
            const auditResult = JSON.parse(auditResponse.content.replace(/```json|```/gi, '').trim());

            // Adjust scores based on Strategic Audit
            scores.trust = Math.min(scores.trust, 100 - auditResult.risk_score);
            scores.overall = Math.round((scores.overall + (100 - auditResult.risk_score)) / 2);
            
            if (auditResult.verdict !== 'SAFE') {
                flags.push(`🕵️ STRATEGIC_AUDIT: ${auditResult.verdict} - ${auditResult.reasoning}`);
                auditResult.patterns_detected.forEach((p: string) => flags.push(`🚩 PATTERN: ${p}`));
            }
        } catch (e) {
            console.error('[Filter] Strategic Audit failed, falling back to keywords:', e);
        }
    }

    // 4. Filter content — strip obvious hype phrases
    const filteredContent = stripHype(rawContent);

    // 5. Determine approval — must pass ethical thresholds
    const approved = scores.overall >= 50 && scores.hype_level < 60;

    return {
        approved,
        filtered_content: filteredContent,
        scores,
        flags,
        raw_content: rawContent,
    };
}

/**
 * Calculate multi-dimensional ethical scores for content.
 */
function calculateScores(content: string): FilterScores {
    let hypeCount = 0;
    let scamCount = 0;
    let ethicalCount = 0;

    HYPE_KEYWORDS.forEach(keyword => {
        if (content.includes(keyword.toLowerCase())) hypeCount++;
    });

    SCAM_INDICATORS.forEach(indicator => {
        if (content.includes(indicator.toLowerCase())) scamCount++;
    });

    ETHICAL_KEYWORDS.forEach(keyword => {
        if (content.includes(keyword.toLowerCase())) ethicalCount++;
    });

    // Hype level: higher = worse
    const hype_level = Math.min(100, hypeCount * 15);

    // Trust: penalized by scam indicators, boosted by ethical keywords
    const trust = Math.max(0, Math.min(100, 70 + ethicalCount * 5 - scamCount * 20 - hypeCount * 5));

    // Fairness: based on ethical language presence
    const fairness = Math.max(0, Math.min(100, 60 + ethicalCount * 6 - scamCount * 15));

    // Long-term profit: ethical content scores higher
    const long_term_profit = Math.max(0, Math.min(100, 65 + ethicalCount * 4 - hypeCount * 8 - scamCount * 10));

    // Overall weighted average
    const overall = Math.round(
        trust * 0.3 + fairness * 0.25 + long_term_profit * 0.25 + (100 - hype_level) * 0.2
    );

    return { long_term_profit, trust, fairness, hype_level, overall };
}

/**
 * Detect and categorize content flags.
 */
function detectFlags(content: string): string[] {
    const flags: string[] = [];

    SCAM_INDICATORS.forEach(indicator => {
        if (content.includes(indicator.toLowerCase())) {
            flags.push(`⚠️ SCAM_INDICATOR: "${indicator}" detected`);
        }
    });

    let hypeCount = 0;
    HYPE_KEYWORDS.forEach(keyword => {
        if (content.includes(keyword.toLowerCase())) {
            hypeCount++;
        }
    });

    if (hypeCount >= 3) {
        flags.push(`🔊 HIGH_HYPE: ${hypeCount} hype keywords detected`);
    } else if (hypeCount >= 1) {
        flags.push(`📢 MODERATE_HYPE: ${hypeCount} hype keyword(s) detected`);
    }

    let ethicalCount = 0;
    ETHICAL_KEYWORDS.forEach(keyword => {
        if (content.includes(keyword.toLowerCase())) ethicalCount++;
    });

    if (ethicalCount >= 5) {
        flags.push('✅ HIGH_ETHICS: Strong ethical language detected');
    } else if (ethicalCount >= 2) {
        flags.push('🟢 MODERATE_ETHICS: Some ethical indicators present');
    }

    if (flags.length === 0) {
        flags.push('🔇 NEUTRAL: No significant signals detected');
    }

    return flags;
}

/**
 * Strip obvious hype language from content while preserving structure.
 */
function stripHype(content: string): string {
    let cleaned = content;

    // Remove extreme hype phrases (case-insensitive)
    const extremeHype = [
        /\b(guaranteed|get rich quick|easy money)\b/gi,
        /🚀{2,}/g, // Multiple rocket emojis
        /💰{2,}/g, // Multiple money emojis
        /!{3,}/g,   // Excessive exclamation marks → single
    ];

    extremeHype.forEach(pattern => {
        cleaned = cleaned.replace(pattern, (match) => {
            if (match.match(/!{3,}/)) return '!';
            return `[HYPE_FILTERED: ${match}]`;
        });
    });

    return cleaned;
}

/**
 * Generate a summary of the filter results for display.
 */
export function generateFilterSummary(result: FilterResult): string {
    const { scores, flags, approved } = result;
    const status = approved ? '✅ APPROVED' : '⛔ FLAGGED';

    return [
        `${status} | Overall: ${scores.overall}/100`,
        `Trust: ${scores.trust} | Fairness: ${scores.fairness} | LT-Profit: ${scores.long_term_profit} | Hype: ${scores.hype_level}`,
        `Flags: ${flags.join(', ')}`,
    ].join('\n');
}
