import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Export data rows as a PDF table with proper Arabic text support.
 * Uses html2canvas to leverage the browser's native Arabic text rendering,
 * which correctly handles RTL, ligatures, and all Arabic glyphs.
 */
export async function exportTablePdf(
  title: string,
  headers: string[],
  rows: string[][],
  filename: string = "export.pdf"
) {
  // Create a hidden container for the HTML table
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed; top: -9999px; left: -9999px;
    width: 1120px; padding: 30px;
    background: white; font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
    direction: rtl; color: #222;
  `;

  // Build HTML
  const dateStr = new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
  
  container.innerHTML = `
    <div style="text-align:center; margin-bottom:24px;">
      <h1 style="font-size:22px; font-weight:700; color:#030957; margin:0 0 4px 0;">${title}</h1>
      <p style="font-size:11px; color:#888; margin:0;">تاريخ التصدير: ${dateStr}</p>
    </div>
    <table style="width:100%; border-collapse:collapse; font-size:12px;">
      <thead>
        <tr>
          ${headers.map(h => `<th style="
            background:#2980B3; color:white; padding:10px 8px;
            text-align:center; font-weight:600; font-size:12px;
            border:1px solid #2472a0;
          ">${h}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${rows.map((row, ri) => `
          <tr style="background:${ri % 2 === 0 ? "#f8f9fc" : "#ffffff"};">
            ${row.map(cell => `<td style="
              padding:8px; text-align:center; border:1px solid #e8eaed;
              font-size:11px; color:#333;
            ">${cell}</td>`).join("")}
          </tr>
        `).join("")}
      </tbody>
    </table>
    <div style="text-align:center; margin-top:20px; font-size:10px; color:#aaa;">
      UberFix © ${new Date().getFullYear()} — جميع الحقوق محفوظة
    </div>
  `;

  document.body.appendChild(container);

  try {
    // Wait for fonts to be ready
    await document.fonts.ready;

    const canvas = await html2canvas(container, {
      scale: 2, // High quality
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // Calculate PDF dimensions (landscape A4)
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const usableWidth = pdfWidth - margin * 2;

    // Scale image to fit PDF width
    const ratio = usableWidth / imgWidth;
    const scaledHeight = imgHeight * ratio;

    // Handle multi-page if content is taller than one page
    const usableHeight = pdfHeight - margin * 2;
    let remainingHeight = scaledHeight;
    let sourceY = 0;
    let page = 0;

    while (remainingHeight > 0) {
      if (page > 0) pdf.addPage();

      const sliceHeight = Math.min(remainingHeight, usableHeight);
      
      // Calculate source crop from original canvas
      const sourceSliceHeight = sliceHeight / ratio;
      
      // Create a cropped canvas for this page
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = imgWidth;
      pageCanvas.height = Math.ceil(sourceSliceHeight);
      const ctx = pageCanvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(canvas, 0, sourceY, imgWidth, sourceSliceHeight, 0, 0, imgWidth, sourceSliceHeight);
      
      const pageImgData = pageCanvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(pageImgData, "JPEG", margin, margin, usableWidth, sliceHeight);

      // Page number
      pdf.setFontSize(8);
      pdf.setTextColor(180);
      pdf.text(
        `${page + 1}`,
        pdfWidth / 2,
        pdfHeight - 4,
        { align: "center" }
      );

      sourceY += sourceSliceHeight;
      remainingHeight -= usableHeight;
      page++;
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Export data as CSV download
 */
export function exportTableCsv(
  headers: string[],
  rows: string[][],
  filename: string = "export.csv"
) {
  const bom = "\uFEFF"; // UTF-8 BOM for Arabic
  const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
