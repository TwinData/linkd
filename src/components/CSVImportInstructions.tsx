import React from 'react';

/**
 * Component to display CSV import instructions with information about supported fields
 */
export const CSVImportInstructions: React.FC = () => {
  return (
    <div className="text-sm text-muted-foreground">
      <p>CSV should include columns:</p>
      <ul className="list-disc pl-5 mt-1">
        <li><strong>Required:</strong> client_name, amount_kd, rate_kes_per_kd</li>
        <li>
          <strong>Optional:</strong> date (MM/DD/YYYY format), type, transaction_fee_kes, notes, reference
        </li>
      </ul>
      <p className="mt-1">
        <strong>Note:</strong> If a date column is provided, transactions will use that date instead of today's date.
      </p>
    </div>
  );
};

export default CSVImportInstructions;
