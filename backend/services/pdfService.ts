import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import fs from 'fs';
import path from 'path';

/**
 * PDF Service
 * Generates structured Silent Beast Intelligence Reports.
 */

export async function generateIntelligencePDF(reportData: any): Promise<string> {
    // Determine if we have nested report_data or if it's a flat finding
    const data = reportData.report_data || reportData;
    const reportId = reportData.id || data.id || 'ZN-STRAT';

    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `Silent_Beast_Intelligence_${timestamp}.pdf`;
    const reportsDir = path.join(process.cwd(), 'reports');

    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir);
    }

    const filePath = path.join(reportsDir, fileName);

    // Strict cleansing utility
    const cleanse = (text: string) => {
        if (!text) return '';
        // Remove markdown symbols accurately
        let clean = text.replace(/(\*\*|\*|_|#|`)/g, '');
        // Remove structural characters that shouldn't be in prose
        clean = clean.replace(/[{\}[\]]/g, '');
        // Fix newline escapes
        clean = clean.replace(/\\n/g, '\n');
        return clean.trim();
    };

    // Helpers
    const centerText = (text: string, y: number, fontSize: number, isBold: boolean = false) => {
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.setFontSize(fontSize);
        const textWidth = doc.getTextWidth(text);
        doc.text(text, (pageWidth - textWidth) / 2, y);
    };

    const drawHeader = () => {
        doc.setFillColor(15, 23, 42); // slate-950
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setTextColor(255, 255, 255);
        centerText('SILENT BEAST DOMINANCE REPORT V2', 18, 20, true);
        centerText('Karuppu INTELLIGENCE STRATA', 28, 11, false);
        doc.setTextColor(0, 255, 180); // Accent
        centerText('CONFIDENTIAL STRATEGIC ADVISORY', 35, 8, true);
        doc.setTextColor(0, 0, 0); // Reset
    };

    const drawFooter = (pageNum: number, totalPages: number) => {
        doc.setFillColor(15, 23, 42);
        doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        const footerText = `Karuppu CONFIDENTIAL | REPORT ID: ${reportData.id || 'ZN-STRAT'} | Page ${pageNum} of ${totalPages}`;
        const disclaimer = "DISCLAIMER: For analytical purposes only. NOT financial advice.";

        const textWidth = doc.getTextWidth(footerText);
        doc.text(footerText, (pageWidth - textWidth) / 2, pageHeight - 9);

        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        const discWidth = doc.getTextWidth(disclaimer);
        doc.text(disclaimer, (pageWidth - discWidth) / 2, pageHeight - 4);

        doc.setTextColor(0, 0, 0);
    };

    // 1. Initial Header
    drawHeader();

    // 2. Report Overview Section
    let currentY = 55;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('EXECUTIVE IDENTIFIERS', margin, currentY);
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.5);
    doc.line(margin, currentY + 2, pageWidth - margin, currentY + 2);

    currentY += 12;
    doc.setFontSize(11);
    const metaData = [
        ['Report ID:', cleanse(reportId || 'ZN-STRAT-XXXX')],
        ['Generated:', new Date(reportData.created_at || data.created_at || Date.now()).toLocaleString()],
        ['Risk Level:', cleanse(data.risk_level || 'Moderate')],
        ['Score:', `${data.opportunity_score || 85}/100`]
    ];

    // Metadata items - Strict Left Aligned Grid
    metaData.forEach((item, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const xPos = margin + (col * (contentWidth / 2));
        const yPos = currentY + (row * 10);

        doc.setFont('helvetica', 'bold');
        doc.text(item[0], xPos, yPos);
        doc.setFont('helvetica', 'normal');
        // Add a fixed offset from the label for the value
        doc.text(String(item[1]), xPos + 35, yPos);
    });
    currentY += 25;

    // 3. Strategic Content Rendering
    const fullText = cleanse(data.executive_summary || data.summary || data.content || '');
    // Split by sections but preserve them
    const components = fullText.split(/\n\n+/);

    components.forEach((comp) => {
        const text = comp.trim();
        if (!text) return;

        // Is this a header? (Uppercase or Numbered)
        const isHeader = /^[A-Z\s]{5,}(?:\n|$)/.test(text) || /^\d+\./.test(text);

        doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
        doc.setFontSize(isHeader ? 13 : 11);

        if (isHeader) {
            currentY += 5;
            // Draw a subtle line above major headers
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.2);
            doc.line(margin, currentY - 2, pageWidth - margin, currentY - 2);
        }

        const lines = doc.splitTextToSize(text, contentWidth);
        const lineHeight = isHeader ? 8 : 6;
        const totalHeight = lines.length * lineHeight;

        // Page break logic
        if (currentY + totalHeight > (pageHeight - 25)) {
            doc.addPage();
            drawHeader();
            currentY = 55;
            // Reset font after page break
            doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
            doc.setFontSize(isHeader ? 13 : 11);
        }

        // JUSTIFICATION LOGIC
        // Only justify if it's a paragraph (3+ lines) and NOT a header
        const useJustify = !isHeader && lines.length > 2;

        lines.forEach((line: string, i: number) => {
            // Last line of a justified block should be left-aligned
            const isLastLine = i === lines.length - 1;
            const alignMode = (useJustify && !isLastLine) ? 'justify' : 'left';

            doc.text(line, margin, currentY, {
                align: alignMode,
                maxWidth: contentWidth
            });
            currentY += lineHeight;
        });

        currentY += 4; // Paragraph spacing
    });

    // 4. Final Footer pass
    const totalPages = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawFooter(i, totalPages);
    }

    const pdfOutput = doc.output('arraybuffer');
    fs.writeFileSync(filePath, Buffer.from(pdfOutput));
    return filePath;
}

export async function generateSummaryPDF(reports: any[], title: string = 'Intelligence Summary'): Promise<string> {
    const doc = new jsPDF();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `Silent_Beast_Summary_${timestamp}.pdf`;
    const reportsDir = path.join(process.cwd(), 'reports');

    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir);
    }

    const filePath = path.join(reportsDir, fileName);

    // Header
    doc.setFillColor(10, 25, 30);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(0, 255, 200);
    doc.setFontSize(18);
    doc.text('Karuppu — ' + title.toUpperCase(), 15, 20);

    const tableData = reports.map(r => [
        new Date(r.created_at).toLocaleDateString(),
        r.ride_type || 'N/A',
        r.opportunity_score || 0,
        r.status || 'active',
        r.id.slice(0, 8)
    ]);

    autoTable(doc, {
        startY: 40,
        head: [['Date', 'Type', 'Score', 'Status', 'ID']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [0, 255, 200], textColor: [10, 25, 30] },
    });

    const pdfOutput = doc.output('arraybuffer');
    fs.writeFileSync(filePath, Buffer.from(pdfOutput));
    return filePath;
}
