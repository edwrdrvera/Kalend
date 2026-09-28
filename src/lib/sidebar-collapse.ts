const STORAGE_KEY = "kalend.sidebarCollapsed";

export function loadSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function saveSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  } catch {
    // Storage blocked: the preference just won't survive a reload.
  }
}
