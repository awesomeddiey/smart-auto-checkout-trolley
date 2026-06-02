import type { ReceiptData } from "@/types";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

function escapePdfText(value: string): string {
  return value
    .replace(/[^\x20-\x7E]/g, "-")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function money(value: number): string {
  return `$${Number(value || 0).toFixed(2)}`;
}

function fit(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3)}...`;
}

function line(text: string, y: number, options?: { bold?: boolean; size?: number; x?: number }) {
  const font = options?.bold ? "/F2" : "/F1";
  const size = options?.size ?? 11;
  const x = options?.x ?? 48;
  return `BT ${font} ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET`;
}

function buildReceiptPdf(receipt: ReceiptData): Blob {
  const content: string[] = [
    line("SMART AUTO-CHECKOUT TROLLEY", 790, { bold: true, size: 18 }),
    line("PAYMENT RECEIPT", 765, { bold: true, size: 13 }),
    line(`Receipt: ${receipt.receipt_number}`, 730),
    line(`Transaction: ${receipt.transaction_ref}`, 712),
    line(`EcoCash Ref: ${receipt.ecocash_ref || "-"}`, 694),
    line(`Paid At: ${new Date(receipt.paid_at).toLocaleString()}`, 676),
  ];

  if (receipt.customer_phone) content.push(line(`Phone: ${receipt.customer_phone}`, 658));
  if (receipt.trolley_id) content.push(line(`Trolley: ${receipt.trolley_id}`, 640));

  content.push(
    "48 615 m 547 615 l S",
    line("ITEM", 592, { bold: true }),
    line("QTY", 592, { bold: true, x: 365 }),
    line("TOTAL", 592, { bold: true, x: 450 }),
  );

  let y = 570;
  for (const item of receipt.items) {
    content.push(
      line(fit(item.name, 43), y),
      line(String(item.quantity), y, { x: 370 }),
      line(money(item.line_total), y, { x: 450 }),
    );
    y -= 19;
  }

  content.push(
    "48 110 m 547 110 l S",
    line("TOTAL PAID", 82, { bold: true, size: 15 }),
    line(money(receipt.amount), 82, { bold: true, size: 15, x: 450 }),
    line("Thank you for shopping with us.", 45, { size: 10 }),
  );

  const stream = content.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

export function downloadReceiptPdf(receipt: ReceiptData) {
  const url = URL.createObjectURL(buildReceiptPdf(receipt));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${receipt.receipt_number || "receipt"}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
