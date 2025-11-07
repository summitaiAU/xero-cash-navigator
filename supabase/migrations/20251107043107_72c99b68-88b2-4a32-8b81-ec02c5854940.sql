-- Enable realtime for email_attachments table
ALTER TABLE email_attachments REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE email_attachments;