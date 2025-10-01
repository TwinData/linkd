export const exportToCSV = (data: any[], filename: string, excludeFields: string[] = []) => {
  if (data.length === 0) return;
  
  // Filter out excluded fields
  const allHeaders = Object.keys(data[0]);
  const headers = allHeaders.filter(h => !excludeFields.includes(h));
  
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const parseCSV = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        // Handle different line endings (\r\n, \n, \r)
        const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          reject(new Error('CSV must have at least a header and one data row'));
          return;
        }
        
        // Process headers - convert to lowercase for case-insensitive matching
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
        console.log('CSV Headers:', headers);
        
        // Check if date column exists
        const hasDateColumn = headers.includes('date') || headers.includes('transaction_date');
        
        const data = lines.slice(1).map((line, lineIndex) => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const obj: any = {};
          
          headers.forEach((header, index) => {
            // Only set the value if it exists in the CSV
            if (index < values.length) {
              const value = values[index] || '';
              
              // Special handling for date fields
              if ((header === 'date' || header === 'transaction_date') && value) {
                try {
                  // Try to parse the date - support various formats (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD)
                  const parsedDate = new Date(value);
                  if (!isNaN(parsedDate.getTime())) {
                    // Valid date - store as ISO string for consistency
                    obj[header] = parsedDate.toISOString();
                  } else {
                    // If standard parsing fails, try to handle common formats
                    const dateParts = value.split(/[\/\-]/);
                    if (dateParts.length === 3) {
                      // Try MM/DD/YYYY format
                      const month = parseInt(dateParts[0]) - 1; // 0-based month
                      const day = parseInt(dateParts[1]);
                      const year = parseInt(dateParts[2]);
                      
                      if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
                        const dateObj = new Date(year, month, day);
                        obj[header] = dateObj.toISOString();
                      } else {
                        obj[header] = value; // Keep original if parsing fails
                      }
                    } else {
                      obj[header] = value; // Keep original if parsing fails
                    }
                  }
                } catch (e) {
                  console.warn(`Failed to parse date: ${value}`, e);
                  obj[header] = value; // Keep original if parsing fails
                }
              } else {
                obj[header] = value;
              }
            } else {
              obj[header] = '';
            }
          });
          
          console.log(`Parsed row ${lineIndex + 1}:`, obj);
          return obj;
        });
        
        resolve(data);
      } catch (error) {
        console.error('CSV parsing error:', error);
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

interface PDFExportOptions {
  title: string;
  clientName?: string;
  reportPeriod?: string;
  excludeFields?: string[];
}

export const exportToPDF = async (data: any[], options: PDFExportOptions | string) => {
  // Handle backward compatibility - if options is a string, treat it as title
  const { title, clientName, reportPeriod, excludeFields = [] } = 
    typeof options === 'string' 
      ? { title: options, excludeFields: [] } 
      : options;

  // Simple PDF export using print dialog
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  
  // Filter out excluded fields
  const allKeys = Object.keys(data[0] || {});
  const filteredKeys = allKeys.filter(key => !excludeFields.includes(key));
  
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 20px; 
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
        }
        .logo {
          font-size: 32px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 5px;
        }
        .tagline {
          font-size: 14px;
          color: #666;
          margin-bottom: 20px;
        }
        .report-info {
          margin: 20px 0;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 5px;
        }
        .report-info h2 {
          margin: 0 0 10px 0;
          color: #2563eb;
          font-size: 20px;
        }
        .info-item {
          margin: 5px 0;
          font-size: 14px;
        }
        .info-label {
          font-weight: bold;
          color: #555;
        }
        h1 { 
          color: #2563eb; 
          margin: 0;
          font-size: 24px;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 20px;
          font-size: 12px;
        }
        th, td { 
          border: 1px solid #ddd; 
          padding: 10px 8px; 
          text-align: left; 
        }
        th { 
          background-color: #2563eb; 
          color: white;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background-color: #f8f9fa;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        @media print { 
          body { margin: 0; padding: 20px; }
          .header { page-break-after: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">LinKD</div>
        <div class="tagline">Kenya-Kuwait Money Transfer Service</div>
      </div>
      
      <div class="report-info">
        <h2>${title}</h2>
        ${clientName ? `<div class="info-item"><span class="info-label">Client:</span> ${clientName}</div>` : ''}
        ${reportPeriod ? `<div class="info-item"><span class="info-label">Period:</span> ${reportPeriod}</div>` : ''}
        <div class="info-item"><span class="info-label">Generated:</span> ${today}</div>
        <div class="info-item"><span class="info-label">Total Records:</span> ${data.length}</div>
      </div>
      
      <table>
        <thead>
          <tr>
            ${filteredKeys.map(key => `<th>${key.replace(/_/g, ' ').toUpperCase()}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              ${filteredKeys.map(key => `<td>${row[key] || ''}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="footer">
        <div><strong>LinKD</strong> - Reliable & Fast Money Transfer</div>
        <div>This is a system-generated report</div>
      </div>
    </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
};