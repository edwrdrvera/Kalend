import type { AlertKind, AlertOffset } from "@/lib/alerts";

// Wire shapes returned by the calendar API routes: dates arrive as
// ISO strings over JSON, not the `Date` objects the Drizzle types
// declare server-side.

export interface CalendarEvent {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  color: string | null;
  color_overridden: boolean;
  category_id: string | null;
  location: string | null;
  icon: string | null;
  description: string | null;
}

export interface EventsApiResponse {
  success: boolean;
  data?: CalendarEvent[];
  error?: string;
}

export interface CalendarTask {
  id: string;
  title: string;
  due_at: string | null;
  completed: boolean;
  color: string | null;
  color_overridden: boolean;
  category_id: string | null;
}

/** A PATCH /api/tasks/<id> body. The server's parser rules are keyed by
 *  exactly these fields, so adding one on either side fails the type check. */
export interface TaskPatchRequest {
  title?: string;
  due_at?: string | null;
  completed?: boolean;
  color?: string;
  color_overridden?: boolean;
  category_id?: string | null;
}

/** A POST /api/tasks body. */
export type TaskCreateRequest = TaskPatchRequest & { title: string };

export interface TasksApiResponse {
  success: boolean;
  data?: CalendarTask[];
  error?: string;
}

export interface CalendarCategory {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
}

/** A PATCH /api/categories/<id> body. */
export interface CategoryPatchRequest {
  name?: string;
  color?: string;
  description?: string | null;
}

export interface CategoriesApiResponse {
  success: boolean;
  data?: CalendarCategory[];
  error?: string;
}

/** Successful category deletion also returns items detached by the server. */
export interface CategoryDeleteApiResponse {
  success: boolean;
  data?: CalendarCategory;
  events?: CalendarEvent[];
  tasks?: CalendarTask[];
  error?: string;
}

/** A stored alert. Exactly one of `event_id` and `task_id` is set. */
export interface CalendarAlert {
  id: string;
  event_id: string | null;
  task_id: string | null;
  offset_minutes: AlertOffset;
  fire_at: string;
  fired_at: string | null;
}

/** A POST /api/alerts body: name one item with `event_id` or `task_id`. */
export interface AlertCreateRequest {
  event_id?: string;
  task_id?: string;
  offset_minutes: AlertOffset;
}

export interface AlertsApiResponse {
  success: boolean;
  data?: CalendarAlert[];
  error?: string;
}

/** An alert that just fired, with the title of the item it belongs to. */
export interface ClaimedAlert {
  id: string;
  kind: AlertKind;
  item_id: string;
  title: string;
  offset_minutes: AlertOffset;
  fire_at: string;
}

/** `due` fired within five minutes of its time. `missed` came due earlier. */
export interface AlertClaim {
  due: ClaimedAlert[];
  missed: ClaimedAlert[];
}

export interface AlertClaimApiResponse {
  success: boolean;
  data?: AlertClaim;
  error?: string;
}
