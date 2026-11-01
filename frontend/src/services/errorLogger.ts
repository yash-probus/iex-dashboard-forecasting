/**
 * errorLogger.ts
 * 
 * Centralized error logging service.
 * In a production environment, this would integrate directly with tools like Sentry, 
 * LogRocket, or Datadog. For now, it formats and outputs securely to the console.
 */

export interface ErrorLogDetails {
  error: Error;
  errorInfo: React.ErrorInfo;
  location?: string;
  userId?: string;
}

export const logErrorToService = (details: ErrorLogDetails) => {
  const timestamp = new Date().toISOString();
  
  // Format for console (can be swapped for Sentry.captureException etc.)
  console.group(`🚨 Application Error Caught: ${timestamp}`);
  console.error("Message:", details.error.message);
  console.error("Stack:", details.error.stack);
  console.error("Component Stack:", details.errorInfo.componentStack);
  console.groupEnd();
  
  // Future Sentry integration point:
  // Sentry.captureException(details.error, {
  //   contexts: { react: { componentStack: details.errorInfo.componentStack } }
  // });
};
