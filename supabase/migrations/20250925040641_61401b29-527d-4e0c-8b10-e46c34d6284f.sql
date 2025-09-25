-- Add saved_emails column to invoices table to store user-added emails
ALTER TABLE public.invoices 
ADD COLUMN saved_emails TEXT[] DEFAULT '{}';

-- Add comment to explain the column
COMMENT ON COLUMN public.invoices.saved_emails IS 'Array of email addresses manually added by users for this invoice';