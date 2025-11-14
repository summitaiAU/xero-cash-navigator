-- Update existing PARTIALLY PAID status to PARTIALLY_PAID
UPDATE invoices 
SET status = 'PARTIALLY_PAID' 
WHERE status = 'PARTIALLY PAID';