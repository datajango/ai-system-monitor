// src/utils/dateUtils.ts

/**
 * Utility functions for date handling in the System Monitor application
 */

/**
 * Parses various timestamp formats including snapshot ID formats
 * @param timestamp - The timestamp string to parse
 * @returns A Date object or null if invalid
 */
export const parseTimestamp = (timestamp: string): Date | null => {
  try {
    // Handle snapshot ID format (e.g., "2025-03-09_00-45-21")
    if (timestamp.includes("_")) {
      const [datePart, timePart] = timestamp.split("_");
      // Replace hyphens in time with colons
      const formattedTime = timePart.replace(/-/g, ":");
      return new Date(`${datePart}T${formattedTime}`);
    }

    // Handle ISO format (e.g., "2025-03-09T00:45:21.000Z")
    if (timestamp.includes("T")) {
      return new Date(timestamp);
    }

    // Try simple date parsing as fallback
    return new Date(timestamp);
  } catch (e) {
    console.error(`Error parsing timestamp: ${timestamp}`, e);
    return null;
  }
};

/**
 * Formats a timestamp as a localized date string
 * @param timestamp - The timestamp to format
 * @param fallback - Text to show if date is invalid (default: "Unknown date")
 * @returns Formatted date string
 */
export const formatDate = (
  timestamp: string | Date | null | undefined,
  fallback: string = "Unknown date"
): string => {
  if (!timestamp) return fallback;

  const date =
    typeof timestamp === "string" ? parseTimestamp(timestamp) : timestamp;

  if (!date || isNaN(date.getTime())) {
    return fallback;
  }

  return date.toLocaleDateString();
};

/**
 * Formats a timestamp as a localized time string
 * @param timestamp - The timestamp to format
 * @param fallback - Text to show if date is invalid (default: "Unknown time")
 * @returns Formatted time string
 */
export const formatTime = (
  timestamp: string | Date | null | undefined,
  fallback: string = "Unknown time"
): string => {
  if (!timestamp) return fallback;

  const date =
    typeof timestamp === "string" ? parseTimestamp(timestamp) : timestamp;

  if (!date || isNaN(date.getTime())) {
    return fallback;
  }

  return date.toLocaleTimeString();
};

/**
 * Formats a timestamp as a relative time string (e.g., "2 days ago")
 * @param timestamp - The timestamp to format
 * @param fallback - Text to show if date is invalid
 * @returns Relative time string
 */
export const formatRelativeTime = (
  timestamp: string | Date | null | undefined,
  fallback: string = "Unknown time"
): string => {
  if (!timestamp) return fallback;

  const date =
    typeof timestamp === "string" ? parseTimestamp(timestamp) : timestamp;

  if (!date || isNaN(date.getTime())) {
    return fallback;
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return "just now";
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  } else if (diffDays < 30) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  } else {
    return formatDate(date);
  }
};

/**
 * Creates a formatted date+time string
 * @param timestamp - The timestamp to format
 * @param fallback - Text to show if date is invalid
 * @returns Formatted date and time string
 */
export const formatDateTime = (
  timestamp: string | Date | null | undefined,
  fallback: string = "Unknown date/time"
): string => {
  if (!timestamp) return fallback;

  const date =
    typeof timestamp === "string" ? parseTimestamp(timestamp) : timestamp;

  if (!date || isNaN(date.getTime())) {
    return fallback;
  }

  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

/**
 * Extracts a readable name from a snapshot ID
 * @param snapshotId - The snapshot ID (e.g., "SystemState_2025-03-09_00-45-21")
 * @returns A formatted name for display
 */
export const getSnapshotDisplayName = (snapshotId: string): string => {
  if (!snapshotId) return "Unknown Snapshot";

  // Remove prefix if any (like "SystemState_")
  const parts = snapshotId.split("_");

  if (parts.length < 2) {
    return snapshotId;
  }

  // Handle format like "SystemState_2025-03-09_00-45-21"
  if (parts.length >= 3 && parts[1].includes("-") && parts[2].includes("-")) {
    const datePart = parts[1];
    const timePart = parts[2].replace(/-/g, ":");

    try {
      const date = new Date(`${datePart}T${timePart}`);
      return date.toLocaleString();
    } catch (e) {
      // Fall back to just joining the parts if date parsing fails
      return parts.slice(1).join(" ");
    }
  }

  // Handle other formats
  return parts.slice(1).join(" ");
};

/**
 * Calculates the age of a snapshot in days
 * @param timestamp - The timestamp to calculate age from
 * @returns Number of days or null if invalid date
 */
export const getSnapshotAgeInDays = (
  timestamp: string | Date | null | undefined
): number | null => {
  if (!timestamp) return null;

  const date =
    typeof timestamp === "string" ? parseTimestamp(timestamp) : timestamp;

  if (!date || isNaN(date.getTime())) {
    return null;
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};
