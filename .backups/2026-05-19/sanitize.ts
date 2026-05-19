import DOMPurify from 'dompurify';

// Configure DOMPurify for safe template HTML
const ALLOWED_TAGS = [
  'div', 'p', 'span', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot',
  'strong', 'em', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'img', 'a', 'b', 'i', 'u', 'small', 'sub', 'sup',
  'header', 'footer', 'section', 'article', 'main', 'nav', 'aside',
  'figure', 'figcaption', 'blockquote', 'pre', 'code', 'center'
];

const ALLOWED_ATTR = [
  'class', 'style', 'id', 'src', 'alt', 'width', 'height', 
  'colspan', 'rowspan', 'align', 'valign', 'border', 'cellpadding', 'cellspacing'
];

// Forbidden event handlers and dangerous patterns
const FORBID_ATTR = [
  'onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onmousedown',
  'onmouseup', 'onkeydown', 'onkeyup', 'onkeypress', 'onfocus', 'onblur',
  'onchange', 'onsubmit', 'onreset', 'onselect', 'onscroll', 'onresize'
];

/**
 * Sanitize HTML content for templates
 * Removes scripts, event handlers, and other XSS vectors
 */
export function sanitizeHTML(html: string): string {
  if (!html) return '';
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select'],
    FORBID_ATTR,
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'], // Allow target for links
    WHOLE_DOCUMENT: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: false,
  });
}

// Patterns to remove from CSS
const DANGEROUS_CSS_PATTERNS = [
  /expression\s*\(/gi,           // IE expression()
  /behavior\s*:/gi,              // IE behavior
  /@import\s/gi,                 // @import can load external CSS
  /javascript\s*:/gi,            // javascript: URLs
  /vbscript\s*:/gi,              // vbscript: URLs
  /-moz-binding\s*:/gi,          // Firefox binding
  /url\s*\(\s*["']?\s*javascript/gi,  // url(javascript:)
  /url\s*\(\s*["']?\s*data\s*:/gi,    // url(data:) can embed scripts in some contexts
  /url\s*\(\s*["']?\s*vbscript/gi,    // url(vbscript:)
];

/**
 * Sanitize CSS content for templates
 * Removes dangerous CSS patterns that could execute scripts
 */
export function sanitizeCSS(css: string): string {
  if (!css) return '';
  
  let sanitized = css;
  
  // Remove dangerous patterns
  for (const pattern of DANGEROUS_CSS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '/* removed */');
  }
  
  // Remove any remaining script-like content
  sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, ''); // Remove HTML comments
  sanitized = sanitized.replace(/<\/?script[^>]*>/gi, ''); // Remove script tags (shouldn't be in CSS but safety first)
  
  return sanitized;
}

/**
 * Sanitize both HTML and CSS for template usage
 */
export function sanitizeTemplate(html: string, css: string): { html: string; css: string } {
  return {
    html: sanitizeHTML(html),
    css: sanitizeCSS(css),
  };
}
