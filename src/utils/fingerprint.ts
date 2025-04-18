import { v4 as uuidv4 } from 'uuid';

// Local storage key for the fingerprint
const FINGERPRINT_KEY = 'sharenote-fingerprint';

// Generate a simple fingerprint
export const generateFingerprint = (): string => {
  try {
    // Check if we already have a fingerprint in localStorage
    const storedFingerprint = localStorage.getItem(FINGERPRINT_KEY);
    
    if (storedFingerprint && storedFingerprint.length > 0) {
      console.log('Using existing fingerprint:', storedFingerprint);
      return storedFingerprint;
    }

    // Generate a new fingerprint - in a real app, you'd use a more sophisticated
    // fingerprinting method, but we'll keep it simple with a UUID
    const newFingerprint = uuidv4();
    
    // Store the fingerprint in localStorage
    localStorage.setItem(FINGERPRINT_KEY, newFingerprint);
    
    console.log('Generated new fingerprint:', newFingerprint);
    return newFingerprint;
  } catch (error) {
    // In case localStorage is not available (incognito mode, etc.)
    console.error('Error with fingerprint storage:', error);
    return uuidv4(); // Fallback to a temporary fingerprint
  }
};
