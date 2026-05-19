/**
 * Centralized error handling for the application
 * Prevents verbose error logging in production and provides user-friendly error messages
 */

/**
 * Log an error with context - only logs full details in development
 * @param context - Description of where the error occurred
 * @param error - The error object
 */
export function logError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error);
  } else {
    // In production, log minimal info to avoid exposing internals
    console.error(`[${context}] An error occurred`);
  }
}

/**
 * Get a user-friendly error message based on error type
 * Prevents exposing internal database/system details to users
 * @param error - The error object
 * @returns A safe, user-friendly error message in Spanish
 */
export function getUserFriendlyError(error: unknown): string {
  if (!error) {
    return 'Ocurrió un error inesperado';
  }

  // Handle backend SQL/API error patterns
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Permission/RLS errors
    if (message.includes('rls') || message.includes('policy') || message.includes('permission denied')) {
      return 'No tienes permiso para realizar esta acción';
    }
    
    // Foreign key constraint errors
    if (message.includes('foreign key') || message.includes('violates foreign key')) {
      return 'No se puede completar debido a datos relacionados';
    }
    
    // Unique constraint errors
    if (message.includes('unique') || message.includes('duplicate key')) {
      return 'Ya existe un registro con esos datos';
    }
    
    // Not found errors
    if (message.includes('not found') || message.includes('no rows')) {
      return 'No se encontró el registro solicitado';
    }
    
    // Network errors
    if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch')) {
      return 'Error de conexión. Verifica tu conexión a internet';
    }
    
    // Auth errors - keep generic
    if (message.includes('invalid login') || message.includes('invalid credentials')) {
      return 'Email o contraseña incorrectos';
    }
    
    if (message.includes('email already') || message.includes('user already')) {
      return 'Ya existe una cuenta con ese correo electrónico';
    }
    
    if (message.includes('password')) {
      return 'La contraseña no cumple con los requisitos';
    }
    
    // Rate limiting
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return 'Demasiados intentos. Por favor espera un momento';
    }
    
    // Storage errors
    if (message.includes('storage') || message.includes('upload')) {
      return 'Error al procesar el archivo. Intenta nuevamente';
    }
  }

  // Default generic message
  return 'Ocurrió un error inesperado';
}
