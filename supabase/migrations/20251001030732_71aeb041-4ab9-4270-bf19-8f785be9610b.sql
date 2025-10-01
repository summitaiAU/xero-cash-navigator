-- Add processing status tracking columns to invoices table
ALTER TABLE public.invoices 
ADD COLUMN processing_status TEXT DEFAULT 'completed' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN processing_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN processing_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN processing_error TEXT,
ADD COLUMN upload_tracking_id TEXT;

-- Create index for faster lookups by tracking ID
CREATE INDEX idx_invoices_upload_tracking_id ON public.invoices(upload_tracking_id);

-- Create index for faster lookups by processing status
CREATE INDEX idx_invoices_processing_status ON public.invoices(processing_status);

-- Enable realtime for invoices table (if not already enabled)
ALTER TABLE public.invoices REPLICA IDENTITY FULL;

-- Add invoices table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;