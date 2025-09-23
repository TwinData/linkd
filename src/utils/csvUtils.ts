export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
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

export const exportToPDF = async (data: any[], title: string) => {
  // Simple PDF export using print dialog
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <table>
        <thead>
          <tr>
            ${Object.keys(data[0] || {}).map(key => `<th>${key}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              ${Object.values(row).map(value => `<td>${value || ''}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
};