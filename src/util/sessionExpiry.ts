/**
 * Session Expiry Utility
 * 
 * Calculates JWT expiration time based on 11:00 PM (23:00) Asia/Kolkata (Indian) timezone.
 * 
 * Rules:
 * - If login before 11:00 PM IST → expire at 11:00 PM same day
 * - If login after 11:00 PM IST → expire at 11:00 PM next day
 * 
 * This ensures users are logged out only once per day at the fixed cutoff time.
 * 
 * NOTE: This is set to 11:00 PM IST for testing. Change back to 12:00 PM (12, 0) for production.
 */

/**
 * Calculates the expiration timestamp (in seconds since epoch) for a JWT token
 * based on the 11:00 PM IST timezone cutoff.
 * 
 * @returns {number} Unix timestamp in seconds for JWT exp claim
 */
export function getSessionExpiryTimestamp(): number {
  const timezone = 'Asia/Kolkata'; // Indian Standard Time
  const CUTOFF_HOUR = 23; // 11:00 PM
  const CUTOFF_MINUTE = 0; // 0 minutes
  const now = new Date();
  
  // Get current date/time components in Indian timezone
  const timezoneFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = timezoneFormatter.formatToParts(now);
  const getValue = (type: string) => {
    const part = parts.find(p => p.type === type);
    return part ? parseInt(part.value) : 0;
  };
  
  const year = getValue('year');
  const month = getValue('month') - 1; // 0-indexed
  const day = getValue('day');
  const hour = getValue('hour');
  const minute = getValue('minute');
  
  // Create a UTC date representing today at 11:00 PM (as if it were IST local time)
  // We'll then adjust it to find the correct UTC time
  const testUTC = new Date(Date.UTC(year, month, day, CUTOFF_HOUR, CUTOFF_MINUTE, 0, 0));
  
  // Get what time this UTC date represents in IST
  const testTimezoneParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(testUTC);
  
  const testHour = parseInt(testTimezoneParts.find(p => p.type === 'hour')?.value || '0');
  const testMinute = parseInt(testTimezoneParts.find(p => p.type === 'minute')?.value || '0');
  
  // Calculate the difference from 11:00 PM
  const targetMinutes = CUTOFF_HOUR * 60 + CUTOFF_MINUTE; // 11:00 PM = 1380 minutes
  const testMinutes = testHour * 60 + testMinute;
  const diffMinutes = targetMinutes - testMinutes;
  
  // Adjust the UTC time to make it represent 11:00 PM in IST
  const cutoffISTAsUTC = new Date(testUTC);
  cutoffISTAsUTC.setUTCMinutes(cutoffISTAsUTC.getUTCMinutes() + diffMinutes);
  
  // Verify the result (should be 11:00 PM in IST)
  const verifyParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(cutoffISTAsUTC);
  
  const verifyHour = parseInt(verifyParts.find(p => p.type === 'hour')?.value || '0');
  const verifyMinute = parseInt(verifyParts.find(p => p.type === 'minute')?.value || '0');
  
  // Fine-tune if needed (should be exactly 11:00 PM)
  if (verifyHour !== CUTOFF_HOUR || verifyMinute !== CUTOFF_MINUTE) {
    const adjustMinutes = (CUTOFF_HOUR * 60 + CUTOFF_MINUTE) - (verifyHour * 60 + verifyMinute);
    cutoffISTAsUTC.setUTCMinutes(cutoffISTAsUTC.getUTCMinutes() + adjustMinutes);
  }
  
  // Check if current time (in IST) is before or after 11:00 PM
  const currentMinutes = hour * 60 + minute;
  const cutoffMinutes = CUTOFF_HOUR * 60 + CUTOFF_MINUTE;
  
  if (currentMinutes < cutoffMinutes) {
    // Before 11:00 PM → expire at 11:00 PM today
    return Math.floor(cutoffISTAsUTC.getTime() / 1000);
  } else {
    // After 11:00 PM → expire at 11:00 PM tomorrow
    const tomorrow = new Date(cutoffISTAsUTC);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return Math.floor(tomorrow.getTime() / 1000);
  }
}

