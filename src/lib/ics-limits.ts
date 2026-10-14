/** The largest calendar file the import accepts, in bytes. */
export const MAX_ICS_BYTES = 2 * 1024 * 1024;

/** The most events one import may write after repeating events are expanded. */
export const MAX_IMPORTED_EVENTS = 2000;

export const ICS_TOO_LARGE_MESSAGE = "Calendar file is too large";
export const ICS_TOO_MANY_MESSAGE = "This calendar has too many events to import";
export const ICS_NOT_CALENDAR_MESSAGE = "This file is not a calendar";
export const ICS_TIME_ZONE_MESSAGE = "A valid time zone is required";
export const ICS_FILE_REQUIRED_MESSAGE = "Calendar file is required";
