import { getAnalytics, isSupported, logEvent } from "firebase/analytics";
import { app } from "../firebase/config";

// Lazy-loaded analytics instance promise
let analyticsPromise = null;

const initAnalytics = async () => {
  // 1. Only in production environment
  // 2. Only in browser environment (window !== "undefined")
  if (!import.meta.env.PROD || typeof window === "undefined") {
    return null;
  }

  try {
    const supported = await isSupported();
    if (supported) {
      return getAnalytics(app);
    }
  } catch (err) {
    // Fail silently in production without throwing or warning logs
  }
  return null;
};

// Singleton promise for initialization
const getAnalyticsInstance = () => {
  if (!analyticsPromise) {
    analyticsPromise = initAnalytics();
  }
  return analyticsPromise;
};

/**
 * Safely logs an event to Google Analytics.
 * @param {string} eventName Name of the analytics event.
 * @param {object} params Optional key-value parameters.
 */
export const trackEvent = (eventName, params = {}) => {
  // Fire-and-forget promise resolution to keep operations non-blocking
  getAnalyticsInstance()
    .then((analytics) => {
      if (analytics) {
        logEvent(analytics, eventName, params);
      }
    })
    .catch(() => {
      // Swallowed safely, non-blocking
    });
};
