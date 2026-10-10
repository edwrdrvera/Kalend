import { describe, expect, it, mock } from "bun:test";
import type { FormEvent } from "react";
import { renderHook } from "@/test-utils/render-hook";
import { useInspectorSave } from "@/hooks/useInspectorSave";

const submitEvent = { preventDefault: () => {} } as FormEvent;
const networkError = () => new TypeError("Failed to fetch");

async function setup(persist: () => Promise<boolean>) {
  const onProceed = mock(() => {});
  const onStay = mock(() => {});
  const hook = renderHook(() =>
    useInspectorSave({ dirty: true, invalidReason: null, persist, onDirtyChange() {}, onProceed, onStay })
  );
  await hook.act(() => {});
  return { onProceed, onStay, ...hook };
}

describe("useInspectorSave", () => {
  it("a save that throws ends saving and shows the error", async () => {
    const { result, act } = await setup(async () => {
      throw networkError();
    });
    await act(() => result.current.saveAndProceed().catch(() => {}));
    expect(result.current.saving).toBe(false);
    expect(result.current.saveError).toBe("Couldn't save your changes.");
  });

  it("a save that throws keeps the user on the draft instead of rejecting", async () => {
    const { result, act, onProceed, onStay } = await setup(async () => {
      throw networkError();
    });
    let outcome = "pending";
    await act(() =>
      result.current.saveAndProceed().then(
        () => {
          outcome = "resolved";
        },
        () => {
          outcome = "rejected";
        }
      )
    );
    expect(outcome).toBe("resolved");
    expect(onStay).toHaveBeenCalledTimes(1);
    expect(onProceed).not.toHaveBeenCalled();
  });

  it("Save after a thrown save sends the retry", async () => {
    let fail = true;
    const persist = mock(async () => {
      if (fail) throw networkError();
      return true;
    });
    const { result, act } = await setup(persist);
    await act(() => result.current.saveAndProceed().catch(() => {}));
    fail = false;
    await act(() => result.current.handleSubmit(submitEvent));
    expect(persist).toHaveBeenCalledTimes(2);
    expect(result.current.saveError).toBeNull();
  });
});
