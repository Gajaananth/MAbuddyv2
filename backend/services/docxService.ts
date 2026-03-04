import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Header, Footer } from 'docx';
import fs from 'fs';
import path from 'path';

/**
 * Word Export Service
 * Generates professional executive documents for Silent Beast Intelligence.
 */

export async function generateIntelligenceDocx(reportData: any): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `Silent_Beast_Intelligence_${timestamp}.docx`;
    const reportsDir = path.join(process.cwd(), 'reports');

    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir);
    }

    const filePath = path.join(reportsDir, fileName);

    // Strict cleansing utility
    const cleanse = (text: string) => {
        if (!text) return '';
        let clean = text.replace(/(\*\*|\*|_|#|`)/g, '');
        clean = clean.replace(/[{\}[\]]/g, '');
        clean = clean.replace(/\\n/g, '\n');
        return clean.trim();
    };

    // Determine if we have nested report_data or if it's a flat finding
    const data = reportData.report_data || reportData;
    const reportId = reportData.id || data.id || 'ZN-STRAT';

    const summary = cleanse(data.executive_summary || data.summary || data.content || '');
    const sections = summary.split(/(?=[A-Z\s]{5,}(?:\n|$))|(?=\d\.\s)/).filter(Boolean);

    const doc = new Document({
        sections: [
            {
                properties: {},
                headers: {
                    default: new Header({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: "SILENT BEAST DOMINANCE REPORT V2",
                                        bold: true,
                                        size: 28,
                                        color: "0F172A",
                                    }),
                                ],
                                alignment: AlignmentType.CENTER,
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: "ZIUM NOVA INTELLIGENCE STRATA",
                                        size: 20,
                                        color: "64748B",
                                    }),
                                ],
                                alignment: AlignmentType.CENTER,
                            }),
                        ],
                    }),
                },
                footers: {
                    default: new Footer({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `ZIUM NOVA CONFIDENTIAL | REPORT ID: ${reportData.id || 'ZN-STRAT'}`,
                                        italics: true,
                                        size: 16,
                                    }),
                                ],
                                alignment: AlignmentType.CENTER,
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: "DISCLAIMER: For tactical analytical purposes only. NOT financial, legal, or investment advice.",
                                        size: 14,
                                        color: "94A3B8",
                                    }),
                                ],
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 100 },
                            }),
                        ],
                    }),
                },
                children: [
                    new Paragraph({
                        text: "EXECUTIVE IDENTIFIERS",
                        heading: HeadingLevel.HEADING_2,
                        spacing: { before: 400, after: 200 },
                        border: { bottom: { color: "0F172A", space: 1, style: "single", size: 6 } },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Report ID: ", bold: true }),
                            new TextRun(cleanse(reportId || 'ZN-STRAT-XXXX')),
                            new TextRun({ text: "\t\tGenerated: ", bold: true }),
                            new TextRun(new Date(reportData.created_at || data.created_at || Date.now()).toLocaleString()),
                        ],
                        tabStops: [{ type: "left", position: 4500 }],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Risk Level: ", bold: true }),
                            new TextRun(cleanse(data.risk_level || 'Moderate')),
                            new TextRun({ text: "\t\tScore: ", bold: true }),
                            new TextRun(`${data.opportunity_score || 85}/100`),
                        ],
                        tabStops: [{ type: "left", position: 4500 }],
                        spacing: { after: 400 },
                    }),
                    ...sections.map((section) => {
                        const text = section.trim();
                        const isHeader = text.match(/^[A-Z\s]{5,}(?:\n|$)/) || text.match(/^\d\./);

                        return new Paragraph({
                            children: [
                                new TextRun({
                                    text: text,
                                    bold: !!isHeader,
                                    size: isHeader ? 24 : 22,
                                }),
                            ],
                            alignment: isHeader ? AlignmentType.LEFT : AlignmentType.JUSTIFIED,
                            spacing: { before: isHeader ? 400 : 200, after: 100 },
                            border: isHeader ? { bottom: { color: "E2E8F0", space: 1, style: "single", size: 6 } } : undefined,
                        });
                    }),
                ],
            },
        ],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(filePath, buffer);

    return filePath;
}
