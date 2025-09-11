-- Add transaction_type column to transaction_charges table
ALTER TABLE public.transaction_charges 
ADD COLUMN transaction_type text NOT NULL DEFAULT 'mpesa_send';

-- Create an index for better performance
CREATE INDEX idx_transaction_charges_type_amount ON public.transaction_charges(transaction_type, min_amount, max_amount);

-- Clear existing data to add new structured data
DELETE FROM public.transaction_charges;

-- Insert MPESA Send Money rates
INSERT INTO public.transaction_charges (min_amount, max_amount, charge_amount, transaction_type) VALUES
(1, 49, 0, 'mpesa_send'),
(50, 100, 0, 'mpesa_send'),
(101, 500, 7, 'mpesa_send'),
(501, 1000, 13, 'mpesa_send'),
(1001, 1500, 23, 'mpesa_send'),
(1501, 2500, 33, 'mpesa_send'),
(2501, 3500, 53, 'mpesa_send'),
(3501, 5000, 57, 'mpesa_send'),
(5001, 7500, 78, 'mpesa_send'),
(7501, 10000, 90, 'mpesa_send'),
(10001, 15000, 100, 'mpesa_send'),
(15001, 20000, 105, 'mpesa_send'),
(20001, 25000, 108, 'mpesa_send'),
(25001, 30000, 108, 'mpesa_send'),
(30001, 35000, 108, 'mpesa_send'),
(35001, 45000, 108, 'mpesa_send'),
(45001, 50000, 108, 'mpesa_send'),
(50001, 70000, 108, 'mpesa_send'),
(70001, 100000, 108, 'mpesa_send');

-- Insert Paybill rates  
INSERT INTO public.transaction_charges (min_amount, max_amount, charge_amount, transaction_type) VALUES
(1, 49, 0, 'paybill'),
(50, 100, 0, 'paybill'),
(101, 500, 5, 'paybill'),
(501, 1000, 10, 'paybill'),
(1001, 1500, 15, 'paybill'),
(1501, 2500, 20, 'paybill'),
(2501, 3500, 25, 'paybill'),
(3501, 5000, 34, 'paybill'),
(5001, 7500, 42, 'paybill'),
(7501, 10000, 48, 'paybill'),
(10001, 15000, 57, 'paybill'),
(15001, 20000, 62, 'paybill'),
(20001, 25000, 67, 'paybill'),
(25001, 30000, 72, 'paybill'),
(30001, 35000, 83, 'paybill'),
(35001, 45000, 99, 'paybill'),
(45001, 50000, 103, 'paybill'),
(50001, 70000, 108, 'paybill'),
(70001, 100000, 108, 'paybill');