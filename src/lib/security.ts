/**
 * Security utilities to prevent API key exposure
 */

/**
 * Sanitizes error messages to prevent API key leakage
 * Removes any potential API keys or sensitive data from error messages
 */
export function sanitizeError(error: any): string {
  if (!error) return 'An error occurred'
  
  let errorMessage = error.message || String(error)
  
  // Remove any potential API keys (long strings that might be keys)
  errorMessage = errorMessage.replace(/sk-[a-zA-Z0-9_-]{20,}/g, '[API_KEY_REDACTED]')
  errorMessage = errorMessage.replace(/SG\.[a-zA-Z0-9_-]{50,}/g, '[API_KEY_REDACTED]')
  errorMessage = errorMessage.replace(/[a-zA-Z0-9_-]{40,}/g, (match: string) => {
    // If it looks like a token/key, redact it
    if (match.length > 40 && /^[a-zA-Z0-9_-]+$/.test(match)) {
      return '[TOKEN_REDACTED]'
    }
    return match
  })
  
  // Remove environment variable names that might leak
  errorMessage = errorMessage.replace(/OPENAI_API_KEY|SENDGRID_API_KEY|HUBSPOT_ACCESS_TOKEN/g, '[ENV_VAR_REDACTED]')
  
  return errorMessage
}

/**
 * Validates that environment variables are not accidentally exposed
 * This should be called during build/startup to ensure security
 */
export function validateEnvironmentSecurity() {
  if (typeof window !== 'undefined') {
    // Client-side check - ensure no API keys are exposed
    const exposedKeys = [
      process.env.OPENAI_API_KEY,
      process.env.SENDGRID_API_KEY,
      process.env.HUBSPOT_ACCESS_TOKEN,
    ].filter(Boolean)
    
    if (exposedKeys.length > 0) {
      console.error('SECURITY ERROR: API keys are exposed to client-side code!')
      throw new Error('Security violation: API keys must not be accessible in client-side code')
    }
  }
}

/**
 * Safe error logging that never exposes API keys
 */
export function safeLogError(context: string, error: any) {
  const sanitized = sanitizeError(error)
  console.error(`[${context}]`, sanitized)
  
  // In production, also log to a secure logging service if needed
  if (process.env.NODE_ENV === 'production') {
    // Additional secure logging can be added here
  }
}

