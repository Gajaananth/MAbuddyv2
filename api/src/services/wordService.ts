import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } from 'docx';
import fs from 'fs';
import path from 'path';

/**
 * Word Service
 * Generates editable Word reports for Zium Nova intelligence.
 */

export async function generateIntelligenceWord(reportData: any): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `Silent_Beast_Intelligence_${timestamp}.docx`;
    const reportsDir = path.join(process.cwd(), 'reports');

    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir);
    }

    const filePath = path.join(reportsDir, fileName);

    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    text: "ZIUM NOVA — SILENT BEAST INTELLIGENCE",
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `DATE: ${new Date().toLocaleDateString()}`,
                            bold: true,
                        }),
                    ],
                }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    text: "Weekly ride Intelligence Report",
                    heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({
                    text: "Strategic Opportunity Ranking",
                    heading: HeadingLevel.HEADING_3,
                }),
                new Table({
                    width: {
                        size: 100,
                        type: WidthType.PERCENTAGE,
                    },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Opportunity", bold: true })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Risk", bold: true })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Horizon", bold: true })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Capital", bold: true })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Skill", bold: true })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Scalability", bold: true })] })] }),
                            ],
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph("AI Agent Nodes")] }),
                                new TableCell({ children: [new Paragraph("Medium")] }),
                                new TableCell({ children: [new Paragraph("6-12m")] }),
                                new TableCell({ children: [new Paragraph("Low")] }),
                                new TableCell({ children: [new Paragraph("High")] }),
                                new TableCell({ children: [new Paragraph("9/10")] }),
                            ],
                        }),
                    ],
                }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    text: "Executive Summary & Signals",
                    heading: HeadingLevel.HEADING_3,
                }),
                new Paragraph({
                    text: typeof reportData === 'string' ? reportData : JSON.stringify(reportData, null, 2),
                }),
            ],
        }],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(filePath, buffer);

    console.log(`[Word] Report saved to: ${filePath}`);
    return filePath;
}
