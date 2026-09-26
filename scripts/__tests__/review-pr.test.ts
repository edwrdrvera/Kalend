import { describe, expect, test } from "bun:test";
import { acceptanceCriteria, disallowedTools, reviewPrompt } from "../review-pr";

describe("acceptanceCriteria", () => {
  test("refuses a PR with no linked issue", () => {
    expect(() => acceptanceCriteria([])).toThrow("links no issue");
  });

  test("copies each issue body verbatim", () => {
    const body = "- Tasks keep their Space after a reload\n- A 404 for someone else's Space";
    const criteria = acceptanceCriteria([{ number: 12, title: "Spaces", body }]);
    expect(criteria).toContain("Issue #12: Spaces");
    expect(criteria).toContain(body);
  });
});

describe("reviewPrompt", () => {
  test("contains only the PR URL, the criteria, and the fixed template", () => {
    const prompt = reviewPrompt("https://github.com/o/r/pull/7", "CRITERIA");
    expect(prompt.startsWith("/code-review https://github.com/o/r/pull/7")).toBe(true);
    expect(prompt).toContain("<acceptance_criteria>\nCRITERIA\n</acceptance_criteria>");
    expect(prompt).toContain("fresh-session mode");
  });
});

test("the reviewer can't commit, push, or comment", () => {
  for (const tool of ["git commit", "git push", "gh pr comment", "gh pr merge"]) {
    expect(disallowedTools).toContain(`Bash(${tool}:*)`);
  }
});
