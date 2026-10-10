import { afterEach, describe, expect, it } from "bun:test";
import "../../components/__tests__/test-dom";
import { tabStops, wrapTabTarget } from "../tab-stops";

afterEach(() => {
  document.body.innerHTML = "";
});

function mount(html: string): HTMLElement {
  const root = document.createElement("div");
  root.tabIndex = -1;
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}

const ids = (els: HTMLElement[]) => els.map((el) => el.id);

describe("tabStops", () => {
  it("includes textareas and skips disabled, tabindex -1, and inert controls", () => {
    const root = mount(`
      <button id="a">a</button>
      <textarea id="notes"></textarea>
      <button id="off" disabled>off</button>
      <input id="skip" tabindex="-1" />
      <div inert><input id="hidden" /></div>
      <a id="nolink">plain</a>
      <a id="link" href="#">link</a>
      <div id="custom" tabindex="0"></div>
    `);
    expect(ids(tabStops(root))).toEqual(["a", "notes", "link", "custom"]);
  });
});

describe("wrapTabTarget", () => {
  const html = `<button id="first">first</button><textarea id="mid"></textarea><button id="last">last</button>`;

  it("sends Shift+Tab from the container to the last stop", () => {
    const root = mount(html);
    expect(wrapTabTarget(root, root, true)?.id).toBe("last");
  });

  it("sends Tab from the container to the first stop", () => {
    const root = mount(html);
    expect(wrapTabTarget(root, root, false)?.id).toBe("first");
  });

  it("wraps at both ends", () => {
    const root = mount(html);
    expect(wrapTabTarget(root, root.querySelector("#first"), true)?.id).toBe("last");
    expect(wrapTabTarget(root, root.querySelector("#last"), false)?.id).toBe("first");
  });

  it("leaves focus moves between stops to the browser", () => {
    const root = mount(html);
    expect(wrapTabTarget(root, root.querySelector("#first"), false)).toBeNull();
    expect(wrapTabTarget(root, root.querySelector("#mid"), true)).toBeNull();
  });

  it("does nothing when the container has no stops", () => {
    const root = mount(`<p>empty</p>`);
    expect(wrapTabTarget(root, root, true)).toBeNull();
  });
});
