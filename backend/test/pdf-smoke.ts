/**
 * Renders a sample receipt and a sample report table to verify the bundled
 * Noto Sans font ships a real ₹ glyph (Helvetica would print "Rs.").
 * No database needed. Run: npx tsx test/pdf-smoke.ts <outDir>
 */
import { writeFile } from "fs/promises";
import { join } from "path";
import { PdfService, pdfMoney } from "../src/pdf/pdf.service";

async function main(): Promise<void> {
  const outDir = process.argv[2] ?? ".";
  const pdf = new PdfService();

  const org = {
    hostelName: "Shanti Niwas Boys Hostel",
    addressLine: "Plot 42, Gopalpura Bypass",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302015",
    phone: "9829012345",
  };

  const receipt = await pdf.receipt({
    org,
    receiptNo: "RCP-2026-0041",
    paidAt: new Date().toLocaleString("en-IN"),
    rows: [
      ["Received from", "Rahul Sharma"],
      ["Room", "Room 204"],
      ["Payment for", "RENT (2026-07)"],
      ["Payment mode", "UPI"],
      ["Recorded by", "Mayank Jangid"],
    ],
    amountPaisa: 550000,
    refundedPaisa: 0,
  });
  await writeFile(join(outDir, "smoke-receipt.pdf"), receipt);

  const table = await pdf.table({
    org,
    title: "Dues Report",
    columns: [
      { label: "Resident", width: 150 },
      { label: "Room", width: 80 },
      { label: "Months", width: 80, align: "right" },
      { label: "Dues", width: 213, align: "right" },
    ],
    rows: [
      ["Rahul Sharma", "Room 204", "2", pdfMoney(1100000)],
      ["Amit Verma", "Room 108", "1", pdfMoney(450000)],
    ],
    summary: `Total outstanding: ${pdfMoney(1550000)}`,
  });
  await writeFile(join(outDir, "smoke-dues.pdf"), table);
  console.log(`Wrote smoke-receipt.pdf and smoke-dues.pdf to ${outDir}`);
}

void main();
