import { supabase } from "@/integrations/supabase/client";

export interface EmailListItem {
  id: string;
  status: string;
  priority: number;
  attempt_count: number;
  max_attempts: number;
  from_name: string | null;
  from_email: string | null;
  subject: string | null;
  snippet_text: string | null;
  no_of_attachments: number;
  display_date_local: string | null;
  date_received: string | null;
  created_at: string;
  error_message: string | null;
}

export interface EmailListFilters {
  statuses?: string[];
  hasAttachments?: boolean | null;
  hasErrors?: boolean | null;
  reviewProcessed?: boolean | null;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
  sortBy?: 'newest' | 'oldest' | 'priority' | 'attempts';
}

export interface EmailAttachment {
  id: string;
  email_id: string;
  filename: string;
  mime_type: string;
  mime_detected: string | null;
  size_bytes: number;
  status: string;
  error_code: string | null;
  error_message: string | null;
  previewable: boolean | null;
  viewer_kind: string | null;
  unsupported_reason: string | null;
  text_excerpt: string | null;
  data_base64url: string | null;
  safe_html: string | null;
  eml_headers: any;
  created_at: string;
  updated_at: string;
}

export interface NormalizedEmail {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  to: string[];
  cc: string[];
  body_html?: string;
  body_text?: string;
  attachments: {
    flagged: EmailAttachment[];
    added: EmailAttachment[];
    neutral: EmailAttachment[];
  };
  no_of_attachments: number;
}

const PAGE_SIZE = 30;

/**
 * Fetch email list items with filters (for left sidebar)
 */
export async function fetchReviewEmailList(
  page = 0,
  filters: EmailListFilters = {}
): Promise<{ data: EmailListItem[]; error: Error | null; count: number }> {
  try {
    const offset = page * PAGE_SIZE;
    
    // Build base query
    const baseSelect = `id,
      status,
      priority,
      attempt_count,
      max_attempts,
      from_name,
      from_email,
      subject,
      snippet_text,
      no_of_attachments,
      display_date_local,
      date_received,
      created_at,
      error_message`;

    // Start with base query
    // @ts-ignore
    let query = supabase.from("email_queue").select(baseSelect, { count: "exact" });

    // Apply status filter
    if (filters.statuses && filters.statuses.length > 0) {
      // @ts-ignore
      query = query.in("status", filters.statuses);
    }

    // Apply attachment filter
    if (filters.hasAttachments === true) {
      // @ts-ignore
      query = query.gt("no_of_attachments", 0);
    } else if (filters.hasAttachments === false) {
      // @ts-ignore
      query = query.or("no_of_attachments.eq.0,no_of_attachments.is.null");
    }

    // Apply error filter
    if (filters.hasErrors === true) {
      // @ts-ignore
      query = query.not("error_message", "is", null).neq("error_message", "");
    }

    // Apply review processed filter
    if (filters.reviewProcessed !== null && filters.reviewProcessed !== undefined) {
      // @ts-ignore
      query = query.eq("review_status_processed", filters.reviewProcessed);
    }

    // Apply date range filters
    if (filters.startDate) {
      // @ts-ignore
      query = query.gte("date_received", filters.startDate);
    }
    if (filters.endDate) {
      // @ts-ignore
      query = query.lt("date_received", filters.endDate);
    }

    // Apply text search
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const searchTerm = `%${filters.searchQuery.trim()}%`;
      // @ts-ignore
      query = query.or(
        `subject.ilike.${searchTerm},from_name.ilike.${searchTerm},from_email.ilike.${searchTerm},snippet_text.ilike.${searchTerm}`
      );
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'oldest':
        // @ts-ignore
        query = query.order("date_received", { ascending: true, nullsFirst: false });
        break;
      case 'priority':
        // @ts-ignore
        query = query
          .order("priority", { ascending: false })
          .order("date_received", { ascending: false, nullsFirst: false });
        break;
      case 'attempts':
        // @ts-ignore
        query = query
          .order("attempt_count", { ascending: false })
          .order("date_received", { ascending: false, nullsFirst: false });
        break;
      case 'newest':
      default:
        // @ts-ignore
        query = query.order("date_received", { ascending: false, nullsFirst: false });
        break;
    }

    // Add fallback ordering
    // @ts-ignore
    query = query.order("created_at", { ascending: false });

    // Apply pagination
    // @ts-ignore
    query = query.range(offset, offset + PAGE_SIZE - 1);

    // @ts-ignore
    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching email list:", error);
      return { data: [], error, count: 0 };
    }

    const mappedData: EmailListItem[] = (data || []).map((item: any) => ({
      id: item.id,
      status: item.status,
      priority: item.priority,
      attempt_count: item.attempt_count,
      max_attempts: item.max_attempts,
      from_name: item.from_name,
      from_email: item.from_email,
      subject: item.subject,
      snippet_text: item.snippet_text,
      no_of_attachments: item.no_of_attachments || 0,
      display_date_local: item.display_date_local,
      date_received: item.date_received,
      created_at: item.created_at,
      error_message: item.error_message,
    }));

    return { data: mappedData, error: null, count: count || 0 };
  } catch (error) {
    console.error("Unexpected error in fetchReviewEmailList:", error);
    return {
      data: [],
      error: error instanceof Error ? error : new Error(String(error)),
      count: 0,
    };
  }
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
      email_id: att.email_id,
      filename: att.filename || "Unknown File",
      mime_type: att.mime_type || "application/octet-stream",
      mime_detected: att.mime_detected || null,
      size_bytes: att.size_bytes || 0,
      status: att.status,
      error_code: att.error_code,
      error_message: att.error_message,
      previewable: att.previewable,
      viewer_kind: att.viewer_kind,
      unsupported_reason: att.unsupported_reason,
      text_excerpt: att.text_excerpt || null,
      data_base64url: att.data_base64url || null,
      safe_html: att.safe_html || null,
      eml_headers: att.eml_headers || null,
      created_at: att.created_at || new Date().toISOString(),
      updated_at: att.updated_at || new Date().toISOString(),
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
    // Fetch email queue records with pre-parsed fields
    // @ts-ignore - Supabase type inference has issues with complex queries
    const { data: emailQueueData, error: emailError, count } = await supabase
      .from("email_queue")
      .select(
        "id, from_name, from_email, subject, date_received, snippet_text, to_list, cc_list, body_html_safe, body_text_fallback, no_of_attachments",
        { count: "exact" }
      )
      .eq("status", "review")
      .eq("review_status_processed", true)
      .order("date_received", { ascending: false })
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
      .select("id, email_id, filename, mime_type, mime_detected, size_bytes, status, error_code, error_message, previewable, viewer_kind, unsupported_reason, text_excerpt, data_base64url, safe_html, eml_headers, created_at, updated_at")
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
        const emailAttachments = attachmentsByEmailId.get(email.id) || [];
        const grouped = groupAttachments(emailAttachments);

        return {
          id: email.id,
          from: email.from_name 
            ? `${email.from_name} <${email.from_email}>` 
            : email.from_email || "Unknown Sender",
          subject: email.subject || "(No Subject)",
          date: email.date_received || new Date().toISOString(),
          snippet: email.snippet_text || "",
          to: email.to_list || [],
          cc: email.cc_list || [],
          body_html: email.body_html_safe,
          body_text: email.body_text_fallback,
          attachments: grouped,
          no_of_attachments: email.no_of_attachments || 0,
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

export interface EmailContent {
  id: string;
  from_name: string | null;
  from_email: string | null;
  to_list: string[];
  cc_list: string[];
  reply_to: string | null;
  subject: string | null;
  date_received: string | null;
  display_date_local: string | null;
  headers_slim: any;
  body_html_safe: string | null;
  body_text_fallback: string | null;
}

/**
 * Fetch email content for conversation view (no attachments)
 */
export async function fetchEmailContent(
  emailId: string
): Promise<{ data: EmailContent | null; error: Error | null }> {
  try {
    // @ts-ignore - Supabase type inference has issues with complex queries
    const { data, error } = await supabase
      .from("email_queue")
      .select(
        `id,
        from_name,
        from_email,
        to_list,
        cc_list,
        reply_to,
        subject,
        date_received,
        display_date_local,
        headers_slim,
        body_html_safe,
        body_text_fallback`
      )
      .eq("id", emailId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching email content:", error);
      return { data: null, error };
    }

    if (!data) {
      return { data: null, error: new Error("Email not found") };
    }

    // Cast to EmailContent
    const emailContent: EmailContent = {
      id: (data as any).id,
      from_name: (data as any).from_name,
      from_email: (data as any).from_email,
      to_list: (data as any).to_list || [],
      cc_list: (data as any).cc_list || [],
      reply_to: (data as any).reply_to,
      subject: (data as any).subject,
      date_received: (data as any).date_received,
      display_date_local: (data as any).display_date_local,
      headers_slim: (data as any).headers_slim,
      body_html_safe: (data as any).body_html_safe,
      body_text_fallback: (data as any).body_text_fallback,
    };

    return { data: emailContent, error: null };
  } catch (error) {
    console.error("Unexpected error in fetchEmailContent:", error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Fetch attachments for a specific email
 */
export async function fetchEmailAttachments(
  emailId: string
): Promise<{ data: EmailAttachment[]; error: Error | null }> {
  try {
    // @ts-ignore - Supabase type inference has issues with complex queries
    const { data, error } = await (supabase as any)
      .from("email_attachments")
      .select(
        "id, email_id, filename, mime_type, mime_detected, size_bytes, status, error_code, error_message, previewable, viewer_kind, unsupported_reason, text_excerpt, data_base64url, safe_html, eml_headers, created_at, updated_at"
      )
      .eq("email_id", emailId)
      .order("status", { ascending: true }) // review first, then completed
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching email attachments:", error);
      return { data: [], error };
    }

    return { data: (data as any[]) || [], error: null };
  } catch (error) {
    console.error("Unexpected error in fetchEmailAttachments:", error);
    return {
      data: [],
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Fetch a single attachment by ID
 */
export async function fetchAttachmentById(
  attachmentId: string
): Promise<{ data: EmailAttachment | null; error: Error | null }> {
  try {
    // @ts-ignore - Supabase type inference has issues with complex queries
    const { data, error } = await (supabase as any)
      .from("email_attachments")
      .select(
        "id, email_id, filename, mime_type, mime_detected, size_bytes, status, error_code, error_message, previewable, viewer_kind, unsupported_reason, text_excerpt, data_base64url, safe_html, eml_headers, created_at, updated_at"
      )
      .eq("id", attachmentId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching attachment:", error);
      return { data: null, error };
    }

    if (!data) {
      return { data: null, error: new Error("Attachment not found") };
    }

    return { data: data as EmailAttachment, error: null };
  } catch (error) {
    console.error("Unexpected error in fetchAttachmentById:", error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Fetch a single email by ID (with attachments)
 */
export async function fetchEmailById(
  emailId: string
): Promise<{ data: NormalizedEmail | null; error: Error | null }> {
  try {
    // @ts-ignore - Supabase type inference has issues with complex queries
    const { data: emailData, error: emailError } = await supabase
      .from("email_queue")
      .select(
        "id, from_name, from_email, subject, date_received, snippet_text, to_list, cc_list, body_html_safe, body_text_fallback, no_of_attachments"
      )
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
      .select("id, email_id, filename, mime_type, mime_detected, size_bytes, status, error_code, error_message, previewable, viewer_kind, unsupported_reason, text_excerpt, data_base64url, safe_html, eml_headers, created_at, updated_at")
      .eq("email_id", emailId);

    if (attachmentsError) {
      console.error("Error fetching attachments:", attachmentsError);
    }

    const grouped = groupAttachments((attachmentsData as any[]) || []);
    const email = emailData as any;

    const normalized: NormalizedEmail = {
      id: email.id,
      from: email.from_name 
        ? `${email.from_name} <${email.from_email}>` 
        : email.from_email || "Unknown Sender",
      subject: email.subject || "(No Subject)",
      date: email.date_received || new Date().toISOString(),
      snippet: email.snippet_text || "",
      to: email.to_list || [],
      cc: email.cc_list || [],
      body_html: email.body_html_safe,
      body_text: email.body_text_fallback,
      attachments: grouped,
      no_of_attachments: email.no_of_attachments || 0,
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

