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
    "git -C . push --force",
    "git -c a=b push -f",
    "git push -fu origin x",
    "git push -uf origin x",
    "git commit --amend",
    "git branch -f develop HEAD~3",
    "git checkout -B develop origin/main",
    "cd scripts && bun review-pr.ts 5",
    "bun run --cwd scripts review-pr.ts 5",
    "git push origin :feat/x",
    "git push --delete origin x",
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
