// Wire shapes returned by the calendar API routes: dates arrive as
// ISO strings over JSON, not the `Date` objects the Drizzle types
// declare server-side.

export interface CalendarEvent {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  color: string | null;
  category_id: string | null;
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
  category_id: string | null;
}

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
