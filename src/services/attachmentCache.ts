import { EmailAttachment } from "./emailReviewService";

// Simple in-memory cache for attachment data
const attachmentCache = new Map<string, {
  data: EmailAttachment;
  timestamp: number;
}>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const attachmentCacheService = {
  get: (attachmentId: string): EmailAttachment | null => {
    const cached = attachmentCache.get(attachmentId);
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      attachmentCache.delete(attachmentId);
      return null;
    }
    
    return cached.data;
  },

  set: (attachmentId: string, data: EmailAttachment) => {
    attachmentCache.set(attachmentId, {
      data,
      timestamp: Date.now(),
    });
  },

  clear: (attachmentId?: string) => {
    if (attachmentId) {
      attachmentCache.delete(attachmentId);
    } else {
      attachmentCache.clear();
    }
  },

  clearForEmail: (emailId: string) => {
    // Clear all attachments for a specific email
    for (const [key, value] of attachmentCache.entries()) {
      if (value.data.email_id === emailId) {
        attachmentCache.delete(key);
      }
    }
  },
};
