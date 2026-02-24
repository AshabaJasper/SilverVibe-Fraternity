import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, formatDate } from "./utils";

// Extend jsPDF type to include autoTable
declare module "jspdf" {
    interface jsPDF {
        autoTable: typeof autoTable;
    }
}

const SACCO_NAME = "SilverVibe Fraternity SACCO";
const SACCO_ADDRESS = "Kampala, Uganda";

function addHeader(doc: jsPDF, title: string, subtitle?: string) {
    // Logo/Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(SACCO_NAME, 105, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(SACCO_ADDRESS, 105, 27, { align: "center" });

    // Report Title
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(title, 105, 40, { align: "center" });

    if (subtitle) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(subtitle, 105, 47, { align: "center" });
    }

    // Date
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 105, subtitle ? 54 : 47, { align: "center" });

    return subtitle ? 60 : 53;
}

function addFooter(doc: jsPDF) {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128);
        doc.text(
            `Page ${i} of ${pageCount}`,
            105,
            doc.internal.pageSize.height - 10,
            { align: "center" }
        );
        doc.text(
            "Confidential - For Internal Use Only",
            105,
            doc.internal.pageSize.height - 5,
            { align: "center" }
        );
    }
}

// Financial Reports
export function generateIncomeStatement() {
    const doc = new jsPDF();
    const startY = addHeader(doc, "Income Statement", "For the Month Ended January 31, 2025");

    const data = [
        ["REVENUE", "", ""],
        ["Interest Income - Loans", "45,800,000", ""],
        ["Interest Income - Investments", "12,500,000", ""],
        ["Membership Fees", "8,400,000", ""],
        ["Service Charges", "3,200,000", ""],
        ["Total Revenue", "", "69,900,000"],
        ["", "", ""],
        ["EXPENSES", "", ""],
        ["Salaries & Benefits", "18,500,000", ""],
        ["Office Rent", "4,200,000", ""],
        ["Utilities", "1,800,000", ""],
        ["Loan Loss Provision", "6,500,000", ""],
        ["Administrative Expenses", "3,400,000", ""],
        ["Total Expenses", "", "34,400,000"],
        ["", "", ""],
        ["NET INCOME", "", "35,500,000"],
    ];

    autoTable(doc, {
        startY,
        head: [["Description", "Amount (UGX)", "Total (UGX)"]],
        body: data,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [74, 144, 217], textColor: 255, fontStyle: "bold" },
        columnStyles: {
            0: { fontStyle: "bold", cellWidth: 100 },
            1: { halign: "right", cellWidth: 45 },
            2: { halign: "right", cellWidth: 45, fontStyle: "bold" },
        },
        didParseCell: (data) => {
            if (data.row.index === 5 || data.row.index === 13 || data.row.index === 15) {
                data.cell.styles.fillColor = [240, 240, 240];
                data.cell.styles.fontStyle = "bold";
            }
        },
    });

    addFooter(doc);
    // Open PDF in new tab instead of forcing download
    window.open(doc.output('bloburl'), '_blank');
}

export function generateBalanceSheet() {
    const doc = new jsPDF();
    const startY = addHeader(doc, "Balance Sheet", "As at January 31, 2025");

    const data = [
        ["ASSETS", "", ""],
        ["Current Assets", "", ""],
        ["Cash & Bank Balances", "850,000,000", ""],
        ["Loan Portfolio (Net)", "2,150,000,000", ""],
        ["Accrued Interest", "45,000,000", ""],
        ["Total Current Assets", "", "3,045,000,000"],
        ["", "", ""],
        ["Fixed Assets", "", ""],
        ["Office Equipment", "85,000,000", ""],
        ["Furniture & Fixtures", "42,000,000", ""],
        ["Total Fixed Assets", "", "127,000,000"],
        ["TOTAL ASSETS", "", "3,172,000,000"],
        ["", "", ""],
        ["LIABILITIES & EQUITY", "", ""],
        ["Current Liabilities", "", ""],
        ["Member Deposits", "2,820,000,000", ""],
        ["Accrued Expenses", "15,000,000", ""],
        ["Total Liabilities", "", "2,835,000,000"],
        ["", "", ""],
        ["Equity", "", ""],
        ["Share Capital", "280,000,000", ""],
        ["Retained Earnings", "57,000,000", ""],
        ["Total Equity", "", "337,000,000"],
        ["TOTAL LIABILITIES & EQUITY", "", "3,172,000,000"],
    ];

    autoTable(doc, {
        startY,
        head: [["Description", "Amount (UGX)", "Total (UGX)"]],
        body: data,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [74, 144, 217], textColor: 255, fontStyle: "bold" },
        columnStyles: {
            0: { fontStyle: "bold", cellWidth: 100 },
            1: { halign: "right", cellWidth: 45 },
            2: { halign: "right", cellWidth: 45, fontStyle: "bold" },
        },
    });

    addFooter(doc);
    window.open(doc.output('bloburl'), '_blank');
}

// Savings Reports
export function generateSavingsSummary() {
    const doc = new jsPDF();
    const startY = addHeader(doc, "Savings Summary Report", "January 2025");

    const data = [
        ["SV-REG", "Regular Savings", "542", "2,850,000,000", "185,000,000", "3,035,000,000"],
        ["SV-FLEX", "Flexi/Wallet", "487", "980,000,000", "45,000,000", "1,025,000,000"],
        ["SV-FIX", "Fixed Savings", "128", "620,000,000", "85,000,000", "705,000,000"],
        ["SV-YNG", "Young Savers", "95", "55,000,000", "8,000,000", "63,000,000"],
    ];

    autoTable(doc, {
        startY,
        head: [["Code", "Product", "Members", "Opening Balance", "Deposits", "Closing Balance"]],
        body: data,
        foot: [["", "TOTAL", "847", "4,505,000,000", "323,000,000", "4,828,000,000"]],
        theme: "striped",
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: "bold" },
        footStyles: { fillColor: [240, 240, 240], fontStyle: "bold" },
        columnStyles: {
            2: { halign: "center" },
            3: { halign: "right" },
            4: { halign: "right" },
            5: { halign: "right" },
        },
    });

    addFooter(doc);
    window.open(doc.output('bloburl'), '_blank');
}

// Loan Reports
export function generateLoanPortfolio() {
    const doc = new jsPDF();
    const startY = addHeader(doc, "Loan Portfolio Report", "As at January 31, 2025");

    const data = [
        ["LN-BUS", "Business Loan", "145", "1,250,000,000", "98,500,000", "7.88%"],
        ["LN-EDU", "Education Loan", "87", "420,000,000", "12,800,000", "3.05%"],
        ["LN-EMG", "Emergency Loan", "65", "180,000,000", "5,200,000", "2.89%"],
        ["LN-AGR", "Agriculture Loan", "42", "300,000,000", "18,500,000", "6.17%"],
    ];

    autoTable(doc, {
        startY,
        head: [["Code", "Product", "Active Loans", "Outstanding", "Arrears", "PAR %"]],
        body: data,
        foot: [["", "TOTAL", "339", "2,150,000,000", "135,000,000", "6.28%"]],
        theme: "striped",
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [26, 26, 26], textColor: 255, fontStyle: "bold" },
        footStyles: { fillColor: [240, 240, 240], fontStyle: "bold" },
        columnStyles: {
            2: { halign: "center" },
            3: { halign: "right" },
            4: { halign: "right" },
            5: { halign: "right" },
        },
    });

    addFooter(doc);
    window.open(doc.output('bloburl'), '_blank');
}

export function generatePARReport() {
    const doc = new jsPDF();
    const startY = addHeader(doc, "Portfolio at Risk (PAR) Report", "Week Ending January 15, 2025");

    const data = [
        ["Current (0 days)", "285", "1,950,000,000", "90.70%"],
        ["Watch (1-30 days)", "32", "125,000,000", "5.81%"],
        ["Substandard (31-60)", "12", "45,000,000", "2.09%"],
        ["Doubtful (61-90)", "7", "22,000,000", "1.02%"],
        ["Loss (90+ days)", "3", "8,000,000", "0.37%"],
    ];

    autoTable(doc, {
        startY,
        head: [["Category", "# Loans", "Amount (UGX)", "% of Portfolio"]],
        body: data,
        foot: [["TOTAL", "339", "2,150,000,000", "100.00%"]],
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: "bold" },
        footStyles: { fillColor: [240, 240, 240], fontStyle: "bold" },
        columnStyles: {
            1: { halign: "center" },
            2: { halign: "right" },
            3: { halign: "right" },
        },
    });

    // Add PAR Summary
    const summaryY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("PAR Summary", 14, summaryY);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("PAR > 30 Days: UGX 75,000,000 (3.49%)", 14, summaryY + 7);
    doc.text("PAR > 60 Days: UGX 30,000,000 (1.40%)", 14, summaryY + 14);
    doc.text("PAR > 90 Days: UGX 8,000,000 (0.37%)", 14, summaryY + 21);

    addFooter(doc);
    window.open(doc.output('bloburl'), '_blank');
}

// Member Reports
export function generateMemberRegister() {
    const doc = new jsPDF("landscape");
    const startY = addHeader(doc, "Member Register", "All Active Members");

    const data = [
        ["SV-0001", "Nakamya Sarah", "F", "1985-03-15", "0772123456", "Kampala", "2020-01-10", "Active"],
        ["SV-0002", "Mukasa James", "M", "1978-07-22", "0756789012", "Entebbe", "2020-01-15", "Active"],
        ["SV-0003", "Nambi Grace", "F", "1992-11-08", "0701234567", "Kampala", "2020-02-01", "Active"],
        ["SV-0042", "Okello David", "M", "1988-05-30", "0782345678", "Jinja", "2020-03-12", "Active"],
        ["SV-0125", "Atim Betty", "F", "1995-09-18", "0773456789", "Kampala", "2021-01-05", "Active"],
    ];

    autoTable(doc, {
        startY,
        head: [["Member ID", "Name", "Gender", "DOB", "Phone", "Location", "Join Date", "Status"]],
        body: data,
        theme: "striped",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [168, 85, 247], textColor: 255, fontStyle: "bold" },
        columnStyles: {
            2: { halign: "center" },
            3: { halign: "center" },
            6: { halign: "center" },
            7: { halign: "center" },
        },
    });

    addFooter(doc);
    window.open(doc.output('bloburl'), '_blank');
}

// Generic report generator
export function generateCustomReport(reportName: string, category: string) {
    const doc = new jsPDF();
    const startY = addHeader(doc, reportName, `${category} - ${new Date().toLocaleDateString()}`);

    doc.setFontSize(10);
    doc.text("This report is currently being generated with sample data.", 14, startY + 10);
    doc.text("Full implementation will be available with backend integration.", 14, startY + 20);

    addFooter(doc);
    window.open(doc.output('bloburl'), '_blank');
}
