import opening_hours from 'opening_hours';

/**
 * Generates a day-by-day schedule from opening hours
 */
function getDayByDaySchedule(
  oh: opening_hours,
  startOfWeek: Date,
  endOfWeek: Date
): string[] {
  const intervals = oh.getOpenIntervals(startOfWeek, endOfWeek);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const daySchedules: string[] = [];
  const locale = navigator.language || 'en-US';

  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(startOfWeek);
    dayStart.setDate(startOfWeek.getDate() + i);

    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);

    const dayIntervals = intervals.filter(([from, to]) => {
      // Check if interval overlaps with this day
      // Changed to use < instead of <= to avoid double-counting midnight boundaries
      return (
        (from >= dayStart && from < dayEnd) ||
        (to > dayStart && to < dayEnd) ||
        (from < dayStart && to >= dayEnd)
      );
    });

    if (dayIntervals.length === 0) {
      daySchedules.push(`${dayNames[i]}: Closed`);
    } else {
      const times = dayIntervals
        .map(([from, to]) => {
          const fromTime = from.toLocaleTimeString(locale, {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });
          const toTime = to.toLocaleTimeString(locale, {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });
          return `${fromTime}-${toTime}`;
        })
        .join(', ');
      daySchedules.push(`${dayNames[i]}: ${times}`);
    }
  }

  return daySchedules;
}

/**
 * Formats an OSM opening_hours string into a more human-readable format
 * @param openingHoursString - The raw opening_hours string from OSM
 * @param detailed - If true, returns a detailed day-by-day breakdown
 * @returns A formatted, human-readable string, or the original if parsing fails
 */
export function formatOpeningHours(
  openingHoursString: string | undefined | null,
  detailed = false
): string {
  if (!openingHoursString) {
    return '';
  }

  try {
    // Try to parse and prettify the opening hours
    const oh = new opening_hours(openingHoursString);

    if (detailed) {
      // Get a week of intervals starting from today
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      const daySchedules = getDayByDaySchedule(oh, startOfWeek, endOfWeek);
      return daySchedules.join('\n');
    }

    // For non-detailed view, use prettifyValue for consistent formatting
    const prettified = oh.prettifyValue({
      rule_sep_string: '; ',
      print_semicolon: false,
    });

    return prettified || openingHoursString;
  } catch (error) {
    // If parsing fails, return the original string
    console.warn('Failed to parse opening_hours:', openingHoursString, error);
    return openingHoursString;
  }
}

/**
 * Gets a detailed breakdown of opening hours for the current week
 * @param openingHoursString - The raw opening_hours string from OSM
 * @returns Array of day-by-day opening hours or null if parsing fails
 */
export function getWeeklySchedule(
  openingHoursString: string | undefined | null
): string[] | null {
  if (!openingHoursString) {
    return null;
  }

  try {
    const oh = new opening_hours(openingHoursString);

    // Get intervals for the current week
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    return getDayByDaySchedule(oh, startOfWeek, endOfWeek);
  } catch (error) {
    console.warn('Failed to get weekly schedule:', openingHoursString, error);
    return null;
  }
}

/**
 * Checks if a place is currently open
 * @param openingHoursString - The raw opening_hours string from OSM
 * @returns true if open, false if closed, null if unknown or parsing failed
 */
export function isCurrentlyOpen(openingHoursString: string | undefined | null): boolean | null {
  if (!openingHoursString) {
    return null;
  }

  try {
    const oh = new opening_hours(openingHoursString);
    return oh.getState();
  } catch (error) {
    console.warn('Failed to check if open:', openingHoursString, error);
    return null;
  }
}
