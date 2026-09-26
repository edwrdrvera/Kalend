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
