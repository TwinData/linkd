// Report generation utilities
import { createCanvas } from "https://deno.land/x/canvas@v1.4.1/mod.ts";
import * as pdf from "https://deno.land/x/pdf@2.0.0/mod.ts";

// Function to generate PDF report
export async function generateReportPDF(
  data: any[],
  reportName: string,
  reportType: string,
  startDate: Date,
  endDate: Date
): Promise<Uint8Array> {
  // Create a new PDF document
  const doc = new pdf.Document();
  
  // Add metadata
  doc.setTitle(reportName);
  doc.setAuthor("Lin-KD Connect");
  doc.setCreationDate(new Date());
  
  // Add the first page
  const page = doc.addPage();
  
  // Set font and size
  page.setFontSize(24);
  page.drawText(reportName, { x: 50, y: page.getHeight() - 50 });
  
  // Add report period
  page.setFontSize(12);
  page.drawText(`Report Period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`, 
    { x: 50, y: page.getHeight() - 80 });
  
  // Add report type
  page.drawText(`Report Type: ${formatReportType(reportType)}`, 
    { x: 50, y: page.getHeight() - 100 });
  
  // Add generation timestamp
  page.drawText(`Generated on: ${new Date().toLocaleString()}`, 
    { x: 50, y: page.getHeight() - 120 });
  
  // Add separator line
  page.drawLine({
    start: { x: 50, y: page.getHeight() - 140 },
    end: { x: page.getWidth() - 50, y: page.getHeight() - 140 },
    thickness: 1,
  });
  
  // If no data, show message
  if (!data || data.length === 0) {
    page.setFontSize(14);
    page.drawText("No data available for the selected period.", 
      { x: 50, y: page.getHeight() - 180 });
  } else {
    // Add data table
    await addDataTable(page, data, reportType);
    
    // Add chart if applicable
    if (data.length > 0) {
      await addChart(doc, data, reportType);
    }
  }
  
  // Add footer
  const pageCount = doc.getPageCount();
  for (let i = 0; i < pageCount; i++) {
    const p = doc.getPage(i);
    p.setFontSize(10);
    p.drawText(`Page ${i + 1} of ${pageCount}`, 
      { x: p.getWidth() - 100, y: 30 });
    p.drawText("Lin-KD Connect", { x: 50, y: 30 });
  }
  
  // Save the PDF to a buffer
  const pdfBytes = await doc.save();
  return pdfBytes;
}

// Helper function to format report type
function formatReportType(reportType: string): string {
  switch (reportType) {
    case "transactions":
      return "Transactions Report";
    case "clients":
      return "Clients Report";
    case "float_deposits":
      return "Float Deposits Report";
    default:
      return reportType.charAt(0).toUpperCase() + reportType.slice(1).replace(/_/g, " ");
  }
}

// Function to add data table to the PDF
async function addDataTable(page: pdf.PDFPage, data: any[], reportType: string): Promise<void> {
  const startY = page.getHeight() - 180;
  const rowHeight = 25;
  const colWidths = calculateColumnWidths(data, reportType);
  const totalWidth = colWidths.reduce((sum, width) => sum + width, 0);
  const startX = (page.getWidth() - totalWidth) / 2;
  
  // Get column headers based on report type
  const headers = getColumnHeaders(reportType);
  
  // Draw table header
  page.setFontSize(12);
  page.setFillColor(0.9, 0.9, 0.9); // Light gray background for header
  page.drawRectangle({
    x: startX,
    y: startY - rowHeight,
    width: totalWidth,
    height: rowHeight,
    color: [0.9, 0.9, 0.9],
  });
  
  let currentX = startX;
  headers.forEach((header, index) => {
    page.drawText(header, {
      x: currentX + 5,
      y: startY - rowHeight + 10,
    });
    currentX += colWidths[index];
  });
  
  // Draw table rows (limited to first page for simplicity)
  const maxRows = Math.min(
    Math.floor((startY - 50) / rowHeight) - 1,
    data.length
  );
  
  for (let i = 0; i < maxRows; i++) {
    const rowY = startY - (i + 2) * rowHeight;
    
    // Alternate row background
    if (i % 2 === 1) {
      page.drawRectangle({
        x: startX,
        y: rowY,
        width: totalWidth,
        height: rowHeight,
        color: [0.95, 0.95, 0.95],
      });
    }
    
    // Draw cell values
    currentX = startX;
    headers.forEach((header, index) => {
      const key = getKeyForHeader(header, reportType);
      let value = data[i][key];
      
      // Format value based on type
      if (typeof value === "number") {
        if (key.includes("amount") || key.includes("total")) {
          value = value.toFixed(2);
        } else if (key.includes("percentage")) {
          value = `${value.toFixed(2)}%`;
        }
      } else if (value instanceof Date) {
        value = value.toLocaleDateString();
      } else if (value === null || value === undefined) {
        value = "-";
      }
      
      page.drawText(String(value), {
        x: currentX + 5,
        y: rowY + 10,
      });
      currentX += colWidths[index];
    });
  }
  
  // If there are more rows than can fit on the first page
  if (data.length > maxRows) {
    page.drawText(`... and ${data.length - maxRows} more rows`, {
      x: startX,
      y: startY - (maxRows + 2) * rowHeight,
    });
  }
}

// Function to add chart to the PDF
async function addChart(doc: pdf.Document, data: any[], reportType: string): Promise<void> {
  // Create a new page for the chart
  const page = doc.addPage();
  
  // Set title
  page.setFontSize(18);
  page.drawText("Report Visualization", { x: 50, y: page.getHeight() - 50 });
  
  try {
    // Create a canvas for the chart
    const canvas = createCanvas(500, 300);
    const ctx = canvas.getContext("2d");
    
    // Draw chart based on report type
    switch (reportType) {
      case "transactions":
        drawTransactionsChart(ctx, data);
        break;
      case "clients":
        drawClientsChart(ctx, data);
        break;
      case "float_deposits":
        drawFloatDepositsChart(ctx, data);
        break;
      default:
        drawGenericChart(ctx, data);
    }
    
    // Convert canvas to image
    const imageData = canvas.toBuffer();
    
    // Add image to PDF
    page.drawImage(imageData, {
      x: 50,
      y: page.getHeight() - 400,
      width: 500,
      height: 300,
    });
  } catch (error) {
    // If chart creation fails, add text explanation
    page.setFontSize(12);
    page.drawText("Chart visualization could not be generated.", {
      x: 50,
      y: page.getHeight() - 100,
    });
    console.error("Chart generation error:", error);
  }
}

// Helper functions for chart drawing
function drawTransactionsChart(ctx: any, data: any[]): void {
  // Simple bar chart for transaction amounts
  const width = 500;
  const height = 300;
  const margin = 40;
  const barWidth = (width - 2 * margin) / Math.min(data.length, 10);
  
  // Clear canvas
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);
  
  // Draw axes
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin, margin);
  ctx.lineTo(margin, height - margin);
  ctx.lineTo(width - margin, height - margin);
  ctx.stroke();
  
  // Find max value for scaling
  const maxValue = Math.max(...data.slice(0, 10).map(d => d.total_amount_kd || 0));
  
  // Draw bars
  data.slice(0, 10).forEach((d, i) => {
    const value = d.total_amount_kd || 0;
    const barHeight = ((height - 2 * margin) * value) / maxValue;
    
    ctx.fillStyle = "rgba(75, 192, 192, 0.7)";
    ctx.fillRect(
      margin + i * barWidth + 5,
      height - margin - barHeight,
      barWidth - 10,
      barHeight
    );
  });
  
  // Add title
  ctx.fillStyle = "black";
  ctx.font = "14px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Transaction Amounts (KD)", width / 2, 20);
}

function drawClientsChart(ctx: any, data: any[]): void {
  // Pie chart for client transaction distribution
  const width = 500;
  const height = 300;
  const radius = Math.min(width, height) / 3;
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Clear canvas
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);
  
  // Group data by client
  const clientGroups = data.reduce((groups, item) => {
    const key = item.client_name || "Unknown";
    if (!groups[key]) {
      groups[key] = 0;
    }
    groups[key] += item.transaction_count || 1;
    return groups;
  }, {});
  
  // Convert to array and sort
  const clientData = Object.entries(clientGroups)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => (b.count as number) - (a.count as number))
    .slice(0, 5); // Top 5 clients
  
  // Calculate total for percentages
  const total = clientData.reduce((sum, item) => sum + (item.count as number), 0);
  
  // Draw pie chart
  let startAngle = 0;
  const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"];
  
  clientData.forEach((item, i) => {
    const sliceAngle = (2 * Math.PI * (item.count as number)) / total;
    
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fill();
    
    startAngle += sliceAngle;
  });
  
  // Add title
  ctx.fillStyle = "black";
  ctx.font = "14px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Client Transaction Distribution", width / 2, 20);
  
  // Add legend
  ctx.textAlign = "left";
  ctx.font = "12px Arial";
  clientData.forEach((item, i) => {
    const y = 40 + i * 20;
    
    // Color box
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(width - 150, y, 10, 10);
    
    // Label
    ctx.fillStyle = "black";
    ctx.fillText(
      `${item.name}: ${((item.count as number) / total * 100).toFixed(1)}%`,
      width - 135,
      y + 9
    );
  });
}

function drawFloatDepositsChart(ctx: any, data: any[]): void {
  // Line chart for float deposits over time
  const width = 500;
  const height = 300;
  const margin = 40;
  
  // Clear canvas
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);
  
  // Draw axes
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin, margin);
  ctx.lineTo(margin, height - margin);
  ctx.lineTo(width - margin, height - margin);
  ctx.stroke();
  
  // Sort data by date
  const sortedData = [...data].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  }).slice(0, 10); // Last 10 entries
  
  if (sortedData.length < 2) {
    ctx.fillStyle = "black";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Not enough data for chart", width / 2, height / 2);
    return;
  }
  
  // Find max value for scaling
  const maxValue = Math.max(...sortedData.map(d => d.total_kes || 0));
  
  // Draw line
  ctx.strokeStyle = "rgba(75, 192, 192, 1)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  
  sortedData.forEach((d, i) => {
    const x = margin + (i * (width - 2 * margin)) / (sortedData.length - 1);
    const y = height - margin - ((d.total_kes || 0) / maxValue) * (height - 2 * margin);
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  
  ctx.stroke();
  
  // Add points
  sortedData.forEach((d, i) => {
    const x = margin + (i * (width - 2 * margin)) / (sortedData.length - 1);
    const y = height - margin - ((d.total_kes || 0) / maxValue) * (height - 2 * margin);
    
    ctx.fillStyle = "rgba(75, 192, 192, 1)";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fill();
  });
  
  // Add title
  ctx.fillStyle = "black";
  ctx.font = "14px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Float Deposits Over Time (KES)", width / 2, 20);
}

function drawGenericChart(ctx: any, data: any[]): void {
  // Simple bar chart for generic data
  const width = 500;
  const height = 300;
  const margin = 40;
  
  // Clear canvas
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);
  
  // Add title
  ctx.fillStyle = "black";
  ctx.font = "14px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Data Summary", width / 2, 20);
  
  // Add data count
  ctx.fillText(`Total records: ${data.length}`, width / 2, height / 2);
}

// Helper function to calculate column widths
function calculateColumnWidths(data: any[], reportType: string): number[] {
  const headers = getColumnHeaders(reportType);
  return headers.map(() => 100); // Fixed width for simplicity
}

// Helper function to get column headers based on report type
function getColumnHeaders(reportType: string): string[] {
  switch (reportType) {
    case "transactions":
      return ["Date", "Amount (KD)", "Rate", "Amount (KES)", "Fee", "Status"];
    case "clients":
      return ["Name", "Email", "Phone", "Transactions", "Total (KD)"];
    case "float_deposits":
      return ["Date", "Total (KD)", "Rate", "Sarah's %", "Total (KES)", "Profit"];
    default:
      return ["ID", "Name", "Value", "Date"];
  }
}

// Helper function to map header to data key
function getKeyForHeader(header: string, reportType: string): string {
  // Map common headers to keys
  switch (header) {
    case "Date":
      return "date";
    case "Amount (KD)":
      return "amount_kd";
    case "Rate":
      return "rate_kes_per_kd";
    case "Amount (KES)":
      return "amount_kes";
    case "Fee":
      return "transaction_fee_kes";
    case "Status":
      return "status";
    case "Name":
      return "name";
    case "Email":
      return "email";
    case "Phone":
      return "phone";
    case "Transactions":
      return "transaction_count";
    case "Total (KD)":
      return "total_kd";
    case "Sarah's %":
      return "sarah_share_percentage";
    case "Total (KES)":
      return "total_kes";
    case "Profit":
      return "profit";
    default:
      return header.toLowerCase().replace(/\s+/g, "_");
  }
}
