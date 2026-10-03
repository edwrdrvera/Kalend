/** The longest description, in characters, after trimming. Client and server both enforce it. */
export const MAX_DESCRIPTION_LENGTH = 2000;

/** What is stored for a draft: trimmed, and null when nothing is left. */
export function normalizeDescription(text: string): string | null {
  return text.trim() || null;
}

/** Why a description can't be saved, or null when it can. */
export function descriptionProblem(text: string): string | null {
  return text.trim().length > MAX_DESCRIPTION_LENGTH
    ? `Description is too long. Keep it under ${MAX_DESCRIPTION_LENGTH} characters.`
    : null;
}

/** True when the draft would store something other than the saved description. */
export function isDescriptionDirty(saved: string | null, draft: string): boolean {
  return normalizeDescription(draft) !== saved;
}
