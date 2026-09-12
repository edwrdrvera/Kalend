import type { EventColor } from "./event-colors";

export interface EventFormValues {
  title: string;
  startAt: string;
  endAt: string;
  color: EventColor;
  colorOverridden: boolean;
  categoryId: string | null;
  location: string | null;
  icon: string | null;
}

export function eventFormPayload(values: EventFormValues) {
  return {
    title: values.title,
    start_at: values.startAt,
    end_at: values.endAt,
    color: values.color,
    color_overridden: values.colorOverridden,
    category_id: values.categoryId,
    location: values.location,
    icon: values.icon,
  };
}
