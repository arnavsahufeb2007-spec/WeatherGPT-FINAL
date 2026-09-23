import { WeatherAdvisory } from "../types.js";

/**
 * Browser Notification Service for Severe Weather Advisories
 *
 * Utilizes the HTML5 Notification API to alert the user of severe or extreme
 * meteorological conditions in the current location.
 * Implements deduplication to prevent alert fatigue.
 */

// Cache of already notified advisory IDs to prevent duplicate alerts in the current session
const notifiedAlertKeys = new Set<string>();

/**
 * Checks if the HTML5 Notification API is available in the current runtime environment
 */
export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Returns the current notification permission state
 */
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) {
    return "unsupported";
  }
  try {
    return Notification.permission;
  } catch {
    return "unsupported";
  }
}

/**
 * Requests browser notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isNotificationSupported()) {
    return "unsupported";
  }
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (error) {
    console.warn("[WeatherGPT Notification] Error requesting permission:", error);
    return "unsupported";
  }
}

/**
 * Determines whether a WeatherAdvisory meets the threshold for severe weather alerts
 */
export function isSevereAdvisory(advisory: WeatherAdvisory): boolean {
  if (!advisory || typeof advisory !== "object") return false;
  return advisory.severity === "severe" || advisory.severity === "extreme";
}

/**
 * Generates a unique deduplication key for an advisory in a given location
 */
export function getAdvisoryAlertKey(advisory: WeatherAdvisory, locationName?: string): string {
  const loc = (locationName || advisory.locationName || "station").trim().toLowerCase();
  return `${loc}:${advisory.id}:${advisory.severity}:${advisory.type}`;
}

/**
 * Clears the session deduplication cache (useful for testing or station reset)
 */
export function clearNotifiedAlerts(): void {
  notifiedAlertKeys.clear();
}

/**
 * Dispatches an HTML5 notification for a severe weather advisory
 */
export function triggerSevereAdvisoryNotification(
  advisory: WeatherAdvisory,
  locationName?: string
): Notification | null {
  if (!isNotificationSupported()) {
    return null;
  }

  const permission = getNotificationPermission();
  if (permission !== "granted") {
    return null;
  }

  const effectiveLocation = locationName || advisory.locationName || "Current Location";
  const severityPrefix = advisory.severity === "extreme" ? "EXTREME ALERT" : "SEVERE ADVISORY";
  const title = `⚠️ ${severityPrefix}: ${advisory.title} (${effectiveLocation})`;

  const bodyText = [
    advisory.description,
    advisory.recommendation ? `Action: ${advisory.recommendation}` : "",
    advisory.timeframe ? `Timeframe: ${advisory.timeframe}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const options: NotificationOptions = {
      body: bodyText,
      icon: "/logo.svg",
      tag: `weathergpt-advisory-${advisory.id}`,
      requireInteraction: advisory.severity === "extreme",
      silent: false,
    };

    const notification = new Notification(title, options);

    notification.onclick = () => {
      try {
        if (typeof window !== "undefined") {
          window.focus();
        }
      } catch {
        // Safe fallback in restricted iframes
      }
      notification.close();
    };

    return notification;
  } catch (err) {
    // Graceful fallback for restricted browser/iframe contexts
    console.warn("[WeatherGPT Notification] Failed to instantiate Notification:", err);
    return null;
  }
}

export interface ProcessAdvisoriesResult {
  totalAdvisories: number;
  severeCount: number;
  triggeredCount: number;
  permission: NotificationPermission | "unsupported";
}

/**
 * Processes an array of WeatherAdvisory items, identifying severe advisories for
 * the current location and firing browser notifications when permitted.
 *
 * @param advisories - Array of WeatherAdvisory items from the weather API
 * @param locationName - Name of the current station / location
 * @param autoRequest - If true and permission is "default", attempts to request permission
 */
export async function processSevereAdvisories(
  advisories: WeatherAdvisory[],
  locationName?: string,
  autoRequest: boolean = true
): Promise<ProcessAdvisoriesResult> {
  if (!advisories || !Array.isArray(advisories) || advisories.length === 0) {
    return {
      totalAdvisories: 0,
      severeCount: 0,
      triggeredCount: 0,
      permission: getNotificationPermission(),
    };
  }

  const severeAdvisories = advisories.filter(isSevereAdvisory);

  if (severeAdvisories.length === 0) {
    return {
      totalAdvisories: advisories.length,
      severeCount: 0,
      triggeredCount: 0,
      permission: getNotificationPermission(),
    };
  }

  let permission = getNotificationPermission();

  // If permission has not been decided and autoRequest is enabled, attempt request
  if (permission === "default" && autoRequest && isNotificationSupported()) {
    permission = await requestNotificationPermission();
  }

  let triggeredCount = 0;

  if (permission === "granted") {
    for (const advisory of severeAdvisories) {
      const alertKey = getAdvisoryAlertKey(advisory, locationName);
      if (!notifiedAlertKeys.has(alertKey)) {
        const notif = triggerSevereAdvisoryNotification(advisory, locationName);
        if (notif) {
          notifiedAlertKeys.add(alertKey);
          triggeredCount++;
        }
      }
    }
  }

  return {
    totalAdvisories: advisories.length,
    severeCount: severeAdvisories.length,
    triggeredCount,
    permission,
  };
}
