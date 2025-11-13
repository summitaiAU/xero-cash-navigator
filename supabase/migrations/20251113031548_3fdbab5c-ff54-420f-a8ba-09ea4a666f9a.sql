-- Add editor tracking columns to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS last_edited_by_user_id uuid,
ADD COLUMN IF NOT EXISTS last_edited_by_email text;

-- Add index for performance on queries filtering by editor
CREATE INDEX IF NOT EXISTS idx_invoices_last_edited_by 
ON public.invoices(last_edited_by_user_id);

-- Add comment for documentation
COMMENT ON COLUMN public.invoices.last_edited_by_user_id IS 'References the user who made the last edit';
COMMENT ON COLUMN public.invoices.last_edited_by_email IS 'Stores the email of the user who made the last edit for display purposes';