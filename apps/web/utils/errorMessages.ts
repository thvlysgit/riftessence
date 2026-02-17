/**
 * User-friendly error message mappings
 * Maps technical error messages to human-readable alternatives
 */

export const RIOT_ERROR_MESSAGES: Record<number, string> = {
  404: "We couldn't find that summoner. Please check your spelling and make sure you've selected the correct region.",
  429: "Too many verification attempts. Please wait a minute and try again.",
  500: "Riot's API is experiencing issues right now. Please try again in a few minutes.",
  502: "Unable to connect to Riot's servers. Please try again later.",
  503: "Riot's API is temporarily unavailable. Please try again in a few minutes.",
};

export const API_ERROR_MESSAGES: Record<string, string> = {
  // Authentication errors
  'Invalid credentials': 'The username/email or password you entered is incorrect. Please try again.',
  'Invalid or expired token': 'Your session has expired. Please log in again.',
  'User not found': 'This account no longer exists.',
  'Too many login attempts': 'Too many failed login attempts. Please wait 15 minutes before trying again.',
  'Too many registration attempts': 'Too many registration attempts from your IP. Please wait 15 minutes before trying again.',
  
  // Validation errors
  'Username already taken': 'This username is already in use. Please choose a different username.',
  'Email already registered': 'This email address is already registered. Try logging in instead.',
  'Invalid email format': 'Please enter a valid email address.',
  'Password must be at least 6 characters': 'Your password must be at least 6 characters long.',
  'Username must be between 3 and 20 characters': 'Your username must be between 3 and 20 characters.',
  
  // Post creation errors
  'Authorization header missing': 'Please log in to create posts.',
  'Cooldown active': 'Please wait before creating another post. You can create one post every 15 minutes.',
  'Post not found': 'This post no longer exists.',
  
  // Profile errors
  'Profile icon does not match verification icon': 'Your summoner icon doesn\'t match the verification icon. Please change your icon in League of Legends and try again.',
  'Summoner not found on Riot': 'Could not find this summoner on Riot\'s servers. Please check your summoner name and region.',
  'Username change cooldown': 'You can only change your username once every 30 days.',
  
  // Network errors
  'Network error': 'Connection failed. Please check your internet connection and try again.',
  'Failed to fetch': 'Unable to reach the server. Please check your connection and try again.',
  
  // Generic fallbacks
  'Failed to create account': 'Unable to create your account. Please try again or contact support if the problem persists.',
  'Failed to refresh token': 'Session refresh failed. Please log in again.',
  'Failed to load user': 'Unable to load your profile. Please refresh the page.',
};

/**
 * Get a user-friendly error message
 * @param error - Error message or status code
 * @param context - Optional context (e.g., 'riot', 'api')
 * @returns User-friendly error message
 */
export function getFriendlyErrorMessage(error: string | number, context?: 'riot' | 'api'): string {
  // Handle Riot API error codes
  if (context === 'riot' && typeof error === 'number') {
    return RIOT_ERROR_MESSAGES[error] || `An error occurred (${error}). Please try again later.`;
  }
  
  // Handle API error messages
  if (typeof error === 'string') {
    const message = API_ERROR_MESSAGES[error];
    if (message) return message;
    
    // Check for partial matches
    for (const [key, value] of Object.entries(API_ERROR_MESSAGES)) {
      if (error.includes(key)) return value;
    }
  }
  
  // Generic fallback
  return typeof error === 'string' ? error : 'An unexpected error occurred. Please try again.';
}

/**
 * Extract error message from various error types
 */
export function extractErrorMessage(error: any): string {
  if (typeof error === 'string') return error;
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.error) return error.error;
  if (error?.message) return error.message;
  return 'An unexpected error occurred';
}
