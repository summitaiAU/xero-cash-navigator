import { supabase } from "@/integrations/supabase/client";
import { toZonedTime } from "date-fns-tz";

/**
 * Get current time in Sydney timezone as ISO string
 */
function getSydneyNow(): string {
  const now = new Date();
  const sydneyTime = toZonedTime(now, "Australia/Sydney");
  return sydneyTime.toISOString();
}

/**
 * Checks if all attachments for an email are processed (no more flagged)
 * If yes, updates reviewed_at timestamp in email_queue (Sydney timezone)
 */
export async function checkAndMarkEmailReviewed(emailId: string): Promise<void> {
  try {
    console.log(`[ReviewCompletion] Checking review status for email ${emailId}`);
    
    // Count flagged attachments for this email
    const { count: flaggedCount, error: countError } = await supabase
      .from('email_attachments')
      .select('*', { count: 'exact', head: true })
      .eq('email_id', emailId)
      .eq('status', 'review');
    
    if (countError) {
      console.error('[ReviewCompletion] Failed to count flagged attachments:', countError);
      return;
    }
    
    console.log(`[ReviewCompletion] Flagged attachments remaining: ${flaggedCount}`);
    
    // If no flagged attachments remain, mark email as reviewed
    if (flaggedCount === 0) {
      const { error: updateError } = await supabase
        .from('email_queue')
        .update({ 
          reviewed_at: getSydneyNow()
        })
        .eq('id', emailId)
        .is('reviewed_at', null); // Only update if not already set
      
      if (updateError) {
        console.error('[ReviewCompletion] Failed to update reviewed_at:', updateError);
      } else {
        console.log(`[ReviewCompletion] ✅ Email ${emailId} marked as reviewed`);
      }
    }
  } catch (error) {
    console.error('[ReviewCompletion] Unexpected error:', error);
  }
}
