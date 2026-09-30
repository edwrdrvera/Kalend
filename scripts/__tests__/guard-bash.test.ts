import { describe, expect, test } from "bun:test";
import { gateFor } from "../guard-bash";

describe("gateFor", () => {
  test.each([
    "git push --force origin feat/x",
    "git push -f",
    "git push --force-with-lease origin HEAD",
    "git push origin +feat/x",
    "git rebase -i origin/develop",
    "git reset --hard origin/develop",
    "git filter-branch --tree-filter x",
    "bun run review:pr 212 --post",
    "bun scripts/review-pr.ts 212",
    "git fetch && git push --force",
  ])("asks before %s", (command) => {
    expect(gateFor(command)).not.toBeNull();
  });

  test.each([
    "git push origin feat/x",
    "git push -u origin chore/orchestration-gates",
    "git reset HEAD~1",
    "git status && git log --oneline -10",
    "bun run review:tier",
    "bun run review:log add 212 real-fixed",
    "git push origin feat/x && echo --force",
  ])("lets %s through", (command) => {
    expect(gateFor(command)).toBeNull();
  });
});
