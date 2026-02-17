/**
 * XSS Sanitization Utility
 * Sanitizes user-generated content to prevent XSS attacks
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML content to prevent XSS
 * Allows safe HTML tags while removing dangerous scripts
 */
export function sanitizeHTML(dirty: string): string {
  if (!dirty) return '';
  
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href'],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitize plain text content
 * Strips all HTML tags and special characters
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize for display in HTML attributes
 * More restrictive for use in attributes like title, alt, etc.
 */
export function sanitizeAttribute(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/[<>'"]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
}

/**
 * Sanitize a URL to prevent javascript: and data: URIs
 */
export function sanitizeURL(url: string): string {
  if (!url) return '';
  
  const cleaned = url.trim().toLowerCase();
  
  // Block dangerous protocols
  if (
    cleaned.startsWith('javascript:') ||
    cleaned.startsWith('data:') ||
    cleaned.startsWith('vbscript:')
  ) {
    return '';
  }
  
  return url;
}


