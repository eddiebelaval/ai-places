/**
 * XSS Sanitization Utilities
 *
 * Provides HTML entity encoding to prevent Cross-Site Scripting (XSS) attacks.
 * Reference: OWASP XSS Prevention Cheat Sheet
 * https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
 */

/**
 * HTML entity map for characters that must be escaped to prevent XSS.
 * These are the minimum characters that need encoding per OWASP guidelines.
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',   // Must be first to avoid double-encoding
  '<': '&lt;',    // Prevents tag injection
  '>': '&gt;',    // Prevents tag injection
  '"': '&quot;',  // Prevents attribute injection (double quotes)
  "'": '&#x27;',  // Prevents attribute injection (single quotes) - using hex for broader compatibility
};

/**
 * Regex pattern matching all characters that need HTML entity encoding.
 * Using a character class for efficient single-pass replacement.
 */
const HTML_ESCAPE_PATTERN = /[&<>"']/g;

/**
 * Encodes HTML special characters to prevent XSS attacks.
 *
 * This function performs HTML entity encoding on user input before storage,
 * which is a defense-in-depth measure. Content should also be properly
 * escaped when rendered, but encoding at storage time provides an
 * additional security layer.
 *
 * @param input - The untrusted user input to sanitize
 * @returns The sanitized string with HTML entities encoded
 *
 * @example
 * sanitizeHtml('<script>alert("xss")</script>')
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 *
 * @example
 * sanitizeHtml("Hello <b>World</b>")
 * // Returns: 'Hello &lt;b&gt;World&lt;/b&gt;'
 *
 * @security
 * - CWE-79: Improper Neutralization of Input During Web Page Generation
 * - OWASP A03:2021 - Injection
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input.replace(HTML_ESCAPE_PATTERN, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Sanitizes content specifically for comment storage.
 * Applies HTML encoding and trims whitespace.
 *
 * @param content - The comment content to sanitize
 * @returns Sanitized and trimmed content
 */
export function sanitizeCommentContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Trim first, then sanitize to avoid encoding leading/trailing whitespace
  const trimmed = content.trim();

  return sanitizeHtml(trimmed);
}
