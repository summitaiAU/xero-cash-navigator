import { supabase } from "@/integrations/supabase/client";

export interface EmailAttachment {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  status: string;
  error_code: string | null;
  error_message: string | null;
  gmail_attachment_id: string;
  gmail_part_id: string;
}

export interface NormalizedEmail {
  id: string;
  from: string;
  to: string;
  cc?: string;
  subject: string;
  date: string;
  body_html?: string;
  body_text?: string;
  body: string; // Keep for backwards compatibility
  messageId: string;
  threadId: string;
  attachments: {
    flagged: EmailAttachment[];
    added: EmailAttachment[];
    neutral: EmailAttachment[];
  };
  rawData?: any;
}

/**
 * Parse email_data_raw to extract normalized fields
 */
function parseEmailData(emailData: any): {
  from: string;
  to: string;
  cc?: string;
  subject: string;
  date: string;
  body: string;
  body_html?: string;
  body_text?: string;
} {
  // Extract from email_data structure
  const emailContent = emailData?.email_data || {};
  
  const from = emailContent.from || "Unknown Sender";
  const to = emailContent.to || "Unknown Recipient";
  const cc = emailContent.cc || undefined;
  const subject = emailContent.subject || "(No Subject)";
  const date = emailContent.date || new Date().toISOString();
  
  const body_html = emailContent.body_html;
  const body_text = emailContent.body_text;
  
  // Prefer HTML, fallback to text with <br> formatting
  let body = "";
  if (body_html) {
    body = body_html;
  } else if (body_text) {
    body = body_text.replace(/\n/g, '<br>');
  } else {
    body = "(No content available)";
  }

  return { from, to, cc, subject, date, body, body_html, body_text };
}

/**
 * Group attachments by type
 */
function groupAttachments(attachments: any[]): {
  flagged: EmailAttachment[];
  added: EmailAttachment[];
  neutral: EmailAttachment[];
} {
  const flagged: EmailAttachment[] = [];
  const added: EmailAttachment[] = [];
  const neutral: EmailAttachment[] = [];

  for (const att of attachments) {
    const normalized: EmailAttachment = {
      id: att.id,
      filename: att.filename || "Unknown File",
      mime_type: att.mime_type || "application/octet-stream",
      size_bytes: att.size_bytes || 0,
      status: att.status,
      error_code: att.error_code,
      error_message: att.error_message,
      gmail_attachment_id: att.gmail_attachment_id || "",
      gmail_part_id: att.gmail_part_id || "",
    };

    if (att.status === "review" && att.error_code) {
      flagged.push(normalized);
    } else if (att.status === "completed" && !att.error_code) {
      added.push(normalized);
    } else if (att.status === "completed" && att.error_code) {
      neutral.push(normalized);
    }
  }

  return { flagged, added, neutral };
}

/**
 * Fetch review emails from email_queue with status='review' and review_status_processed=true
 */
export async function fetchReviewEmails(
  limit = 20,
  offset = 0
): Promise<{ data: NormalizedEmail[]; error: Error | null; count: number }> {
  try {
    // Fetch email queue records
    // @ts-ignore - Supabase type inference has issues with complex queries
    const { data: emailQueueData, error: emailError, count } = await supabase
      .from("email_queue")
      .select("id, message_id, thread_id, created_at, email_data_raw", { count: "exact" })
      .eq("status", "review")
      .eq("review_status_processed", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (emailError) {
      console.error("Error fetching email queue:", emailError);
      return { data: [], error: emailError, count: 0 };
    }

    if (!emailQueueData || emailQueueData.length === 0) {
      return { data: [], error: null, count: 0 };
    }

    // Fetch all attachments for these emails
    const emailIds = emailQueueData.map((e: any) => e.id);
    // @ts-ignore - Supabase type inference has issues with complex queries
    const { data: attachmentsData, error: attachmentsError } = await (supabase as any)
      .from("email_attachments")
      .select("id, email_id, filename, mime_type, size_bytes, status, error_code, error_message, gmail_attachment_id, gmail_part_id")
      .in("email_id", emailIds);

    if (attachmentsError) {
      console.error("Error fetching attachments:", attachmentsError);
      // Continue without attachments rather than failing completely
    }

    // Group attachments by email_id
    const attachmentsByEmailId = new Map<string, any[]>();
    if (attachmentsData) {
      for (const att of attachmentsData as any[]) {
        const emailId = att.email_id;
        if (!attachmentsByEmailId.has(emailId)) {
          attachmentsByEmailId.set(emailId, []);
        }
        attachmentsByEmailId.get(emailId)!.push(att);
      }
    }

    // Normalize the data
    const normalizedEmails: NormalizedEmail[] = emailQueueData.map(
      (email: any) => {
        const parsed = parseEmailData(email.email_data_raw);
        const emailAttachments = attachmentsByEmailId.get(email.id) || [];
        const grouped = groupAttachments(emailAttachments);

        return {
          id: email.id,
          from: parsed.from,
          to: parsed.to,
          cc: parsed.cc,
          subject: parsed.subject,
          date: parsed.date,
          body: parsed.body,
          body_html: parsed.body_html,
          body_text: parsed.body_text,
          messageId: email.message_id,
          threadId: email.thread_id,
          attachments: grouped,
          rawData: email.email_data_raw,
        };
      }
    );

    return { data: normalizedEmails, error: null, count: count || 0 };
  } catch (error) {
    console.error("Unexpected error in fetchReviewEmails:", error);
    return {
      data: [],
      error: error instanceof Error ? error : new Error(String(error)),
      count: 0,
    };
  }
}

/**
 * Fetch a single email by ID
 */
export async function fetchEmailById(
  emailId: string
): Promise<{ data: NormalizedEmail | null; error: Error | null }> {
  try {
    // @ts-ignore - Supabase type inference has issues with complex queries
    const { data: emailData, error: emailError } = await supabase
      .from("email_queue")
      .select("id, message_id, thread_id, created_at, email_data_raw")
      .eq("id", emailId)
      .maybeSingle();

    if (emailError) {
      return { data: null, error: emailError };
    }

    if (!emailData) {
      return { data: null, error: new Error("Email not found") };
    }

    // @ts-ignore - Supabase type inference has issues with complex queries
    const { data: attachmentsData, error: attachmentsError } = await (supabase as any)
      .from("email_attachments")
      .select("id, email_id, filename, mime_type, size_bytes, status, error_code, error_message, gmail_attachment_id, gmail_part_id")
      .eq("email_id", emailId);

    if (attachmentsError) {
      console.error("Error fetching attachments:", attachmentsError);
    }

    const parsed = parseEmailData((emailData as any).email_data_raw);
    const grouped = groupAttachments((attachmentsData as any[]) || []);

    const normalized: NormalizedEmail = {
      id: (emailData as any).id,
      from: parsed.from,
      to: parsed.to,
      cc: parsed.cc,
      subject: parsed.subject,
      date: parsed.date,
      body: parsed.body,
      body_html: parsed.body_html,
      body_text: parsed.body_text,
      messageId: (emailData as any).message_id,
      threadId: (emailData as any).thread_id,
      attachments: grouped,
      rawData: (emailData as any).email_data_raw,
    };

    return { data: normalized, error: null };
  } catch (error) {
    console.error("Unexpected error in fetchEmailById:", error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

