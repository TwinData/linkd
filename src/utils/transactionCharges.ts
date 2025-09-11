import { supabase } from "@/integrations/supabase/client";

export const calculateTransactionFee = async (payoutAmount: number, transactionType: string = 'mpesa_send'): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from("transaction_charges")
      .select("charge_amount")
      .lte("min_amount", payoutAmount)
      .gte("max_amount", payoutAmount)
      .eq("transaction_type", transactionType)
      .maybeSingle();

    if (error) {
      console.error("Error calculating transaction fee:", error);
      return 0;
    }

    if (!data) {
      // If no exact match found, find the closest range for the transaction type
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("transaction_charges")
        .select("charge_amount")
        .eq("transaction_type", transactionType)
        .order("max_amount", { ascending: false })
        .limit(1);

      if (fallbackError || !fallbackData?.length) {
        console.error("No transaction fee found for amount:", payoutAmount, "type:", transactionType);
        return 0;
      }

      return fallbackData[0].charge_amount;
    }

    return data.charge_amount;
  } catch (error) {
    console.error("Error calculating transaction fee:", error);
    return 0;
  }
};

export const formatCurrency = (amount: number, currency: string): string => {
  return `${amount.toFixed(2)} ${currency}`;
};