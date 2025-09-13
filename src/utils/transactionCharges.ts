import { supabase } from "@/integrations/supabase/client";

// Transaction fee tables based on provided data
const sendMoneyFees = [
  { min: 1, max: 49, fee: 0 },
  { min: 50, max: 100, fee: 0 },
  { min: 101, max: 500, fee: 7 },
  { min: 501, max: 1000, fee: 13 },
  { min: 1001, max: 1500, fee: 23 },
  { min: 1501, max: 2500, fee: 33 },
  { min: 2501, max: 3500, fee: 53 },
  { min: 3501, max: 5000, fee: 57 },
  { min: 5001, max: 7500, fee: 78 },
  { min: 7501, max: 10000, fee: 90 },
  { min: 10001, max: 15000, fee: 100 },
  { min: 15001, max: 20000, fee: 105 },
  { min: 20001, max: 35000, fee: 108 },
  { min: 35001, max: 50000, fee: 108 },
  { min: 50001, max: 250000, fee: 108 }
];

const paybillFees = [
  { min: 1, max: 49, fee: 0 },
  { min: 50, max: 100, fee: 0 },
  { min: 101, max: 500, fee: 5 },
  { min: 501, max: 1000, fee: 10 },
  { min: 1001, max: 1500, fee: 15 },
  { min: 1501, max: 2500, fee: 20 },
  { min: 2501, max: 3500, fee: 25 },
  { min: 3501, max: 5000, fee: 34 },
  { min: 5001, max: 7500, fee: 42 },
  { min: 7501, max: 10000, fee: 48 },
  { min: 10001, max: 15000, fee: 57 },
  { min: 15001, max: 20000, fee: 62 },
  { min: 20001, max: 25000, fee: 67 },
  { min: 25001, max: 30000, fee: 72 },
  { min: 30001, max: 35000, fee: 83 },
  { min: 35001, max: 40000, fee: 99 },
  { min: 40001, max: 45000, fee: 103 },
  { min: 45001, max: 50000, fee: 108 },
  { min: 50001, max: 70000, fee: 108 },
  { min: 70001, max: 250000, fee: 108 }
];

/**
 * Calculate transaction fee based on amount and type
 * @param payoutAmount The amount in KES
 * @param transactionType 'mpesa_send' or 'paybill'
 * @returns The transaction fee
 */
export const calculateTransactionFee = async (payoutAmount: number, transactionType: string = 'mpesa_send'): Promise<number> => {
  try {
    console.log(`Calculating fee for ${payoutAmount} KES, type: ${transactionType}`);
    
    // Determine which fee table to use
    const feeTable = transactionType === 'paybill' ? paybillFees : sendMoneyFees;
    
    // Find the appropriate fee range
    const feeRange = feeTable.find(range => 
      payoutAmount >= range.min && payoutAmount <= range.max
    );
    
    if (feeRange) {
      console.log(`Found fee range: ${feeRange.min}-${feeRange.max}, fee: ${feeRange.fee}`);
      return feeRange.fee;
    }
    
    // If amount is larger than any defined range, use the highest fee
    if (payoutAmount > feeTable[feeTable.length - 1].max) {
      console.log(`Amount exceeds defined ranges, using highest fee: ${feeTable[feeTable.length - 1].fee}`);
      return feeTable[feeTable.length - 1].fee;
    }
    
    console.log('No matching fee range found, defaulting to 0');
    return 0;
  } catch (error) {
    console.error("Error calculating transaction fee:", error);
    return 0;
  }
};

export const formatCurrency = (amount: number, currency: string): string => {
  return `${amount.toFixed(2)} ${currency}`;
};