-- Drop existing restrictive policies
DROP POLICY IF EXISTS "email_attachments_auth_read" ON public.email_attachments;
DROP POLICY IF EXISTS "email_attachments_auth_update" ON public.email_attachments;

-- Recreate policies to allow access for both 'review' and 'completed' statuses
CREATE POLICY "email_attachments_auth_read" 
ON public.email_attachments
FOR SELECT
USING (
  (auth.uid() IS NOT NULL) 
  AND is_user_allowed((auth.jwt() ->> 'email'::text)) 
  AND (EXISTS (
    SELECT 1
    FROM email_queue eq
    WHERE eq.id = email_attachments.email_id 
      AND eq.status IN ('review', 'completed')
  ))
);

CREATE POLICY "email_attachments_auth_update" 
ON public.email_attachments
FOR UPDATE
USING (
  (auth.uid() IS NOT NULL) 
  AND is_user_allowed((auth.jwt() ->> 'email'::text)) 
  AND (EXISTS (
    SELECT 1
    FROM email_queue eq
    WHERE eq.id = email_attachments.email_id 
      AND eq.status IN ('review', 'completed')
  ))
)
WITH CHECK (
  (auth.uid() IS NOT NULL) 
  AND is_user_allowed((auth.jwt() ->> 'email'::text)) 
  AND (EXISTS (
    SELECT 1
    FROM email_queue eq
    WHERE eq.id = email_attachments.email_id 
      AND eq.status IN ('review', 'completed')
  ))
);