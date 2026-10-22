import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore,
  setLogLevel,
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  setPersistence,
  browserLocalPersistence,
  User 
} from 'firebase/auth';
import config from '../../firebase-applet-config.json';
import { UserProfile, Book, ReadingReport } from '../types';
import { DEFAULT_CLASSES } from '../data/schoolConstants';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(config) : getApp();

// Initialize Firestore with configured databaseId
export const db = (() => {
  try {
    return getFirestore(app, config.firestoreDatabaseId || undefined);
  } catch (err) {
    console.warn('Initial getFirestore with databaseId warning, falling back to default:', err);
    return getFirestore(app);
  }
})();

// Set log level to silent so transient network retries and auth token refreshes in sandboxed environments do not log noisy console errors
try {
  setLogLevel('silent');
} catch (_) {}

export const auth = getAuth(app);

// Enable persistent session across browser restarts
try {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Auth local persistence setup notice:', err);
  });
} catch (_) {}

export const googleProvider = new GoogleAuthProvider();

// Google Auth helper (Mobile-friendly: runs signInWithPopup first, falls back to signInWithRedirect)
export const signInWithGoogle = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (err) {
    console.warn('Set auth persistence error:', err);
  }

  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });

  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    const code = error?.code || '';

    // If user deliberately closed the popup window, gracefully cancel without redirecting
    if (code === 'auth/popup-closed-by-user') {
      return null;
    }

    // If popup is blocked by mobile browser or not supported in environment, fallback to signInWithRedirect
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/cancelled-popup-request' ||
      code === 'auth/operation-not-supported-in-this-environment' ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    ) {
      console.log('Mobile browser or popup blocked, falling back to signInWithRedirect...');
      await signInWithRedirect(auth, googleProvider);
      return null;
    }

    console.warn('Google Sign-In notice:', error?.message || error);
    throw error;
  }
};

/**
 * Diagnostic helper for Firebase Auth domain authorization
 */
export function getAuthorizedDomainDiagnostic(): { currentDomain: string; isLikelyAuthorized: boolean; recommendation: string } {
  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const configuredDomain = config.authDomain || '';
  const isLikelyAuthorized = currentDomain === 'localhost' || currentDomain === '127.0.0.1' || configuredDomain.includes(currentDomain);
  
  return {
    currentDomain,
    isLikelyAuthorized,
    recommendation: `Tambahkan "${currentDomain}" ke Firebase Console -> Authentication -> Settings -> Authorized Domains.`,
  };
}

export { getRedirectResult, signInWithRedirect, setPersistence, browserLocalPersistence };

export const logoutUser = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Sign Out Error:', error);
  }
};

// URL Transformer helper for Google Drive PDF embeds
export function formatPdfEmbedUrl(url: string): string {
  if (!url) return '';
  
  const trimmedUrl = url.trim();

  // Google Drive URL handling
  if (trimmedUrl.includes('drive.google.com')) {
    // Extract file ID if in format /file/d/FILE_ID or /d/FILE_ID
    const fileIdMatch = trimmedUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || trimmedUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
    }

    // Check for id query parameter e.g., ?id=FILE_ID
    try {
      const parsed = new URL(trimmedUrl);
      const idParam = parsed.searchParams.get('id');
      if (idParam) {
        return `https://drive.google.com/file/d/${idParam}/preview`;
      }
    } catch {
      const idMatch = trimmedUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) {
        return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
      }
    }

    // Direct replacement of /view, /view?usp=sharing, /edit with /preview
    let converted = trimmedUrl
      .replace(/\/view(\?.*)?$/, '/preview')
      .replace(/\/view\?usp=sharing/, '/preview')
      .replace(/\/edit(\?.*)?$/, '/preview');

    if (!converted.includes('/preview')) {
      converted = converted.replace(/\/view/, '/preview');
    }

    return converted;
  }

  // Generic PDF URL through Google Docs Viewer for cross-origin PDF embedding if needed
  if (trimmedUrl.endsWith('.pdf') && !trimmedUrl.includes('google.com')) {
    return `https://docs.google.com/gview?url=${encodeURIComponent(trimmedUrl)}&embedded=true`;
  }

  return trimmedUrl;
}

