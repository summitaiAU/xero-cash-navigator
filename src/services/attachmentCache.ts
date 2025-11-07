import { EmailAttachment } from "./emailReviewService";

// Simple in-memory cache for attachment data
const attachmentCache = new Map<string, {
  data: EmailAttachment;
  timestamp: number;
  size: number;
}>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50; // Maximum 50 attachments in cache
const MAX_CACHE_MEMORY = 100 * 1024 * 1024; // 100MB max

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
    // Estimate memory usage (rough)
    const estimatedSize = (data.data_base64url?.length || 0) + 
                         (data.safe_html?.length || 0) +
                         (data.text_excerpt?.length || 0);
    
    // Check cache size - remove oldest if at limit
    if (attachmentCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = attachmentCache.keys().next().value;
      if (oldestKey) {
        console.log(`[Cache] Size limit reached, removing oldest: ${oldestKey}`);
        attachmentCache.delete(oldestKey);
      }
    }
    
    // Check memory usage - clear cache if over limit
    const currentMemory = attachmentCacheService.getCacheSize();
    if (currentMemory + estimatedSize > MAX_CACHE_MEMORY) {
      console.log(`[Cache] Memory limit reached (${(currentMemory / 1024 / 1024).toFixed(1)}MB), clearing cache`);
      attachmentCache.clear();
    }
    
    attachmentCache.set(attachmentId, {
      data,
      timestamp: Date.now(),
      size: estimatedSize,
    });
    
    console.log(`[Cache] Stored ${attachmentId}, size: ${(estimatedSize / 1024).toFixed(1)}KB, total entries: ${attachmentCache.size}`);
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
    let cleared = 0;
    for (const [key, value] of attachmentCache.entries()) {
      if (value.data.email_id === emailId) {
        attachmentCache.delete(key);
        cleared++;
      }
    }
    if (cleared > 0) {
      console.log(`[Cache] Cleared ${cleared} attachments for email ${emailId}`);
    }
  },

  getCacheSize: (): number => {
    let total = 0;
    for (const entry of attachmentCache.values()) {
      total += entry.size || 0;
    }
    return total;
  },
};
