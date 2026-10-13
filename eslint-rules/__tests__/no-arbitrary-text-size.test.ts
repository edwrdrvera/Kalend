import { describe, it } from "bun:test";
import { RuleTester, type Rule } from "eslint";
import tsParser from "@typescript-eslint/parser";
import plugin from "../no-arbitrary-text-size.mjs";

// Let RuleTester register its cases through bun:test.
RuleTester.describe = describe;
RuleTester.it = it;

const rule = plugin.rules["no-arbitrary-text-size"] as unknown as Rule.RuleModule;
const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    parser: tsParser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const arbitrary = { messageId: "arbitrary" };

ruleTester.run("no-arbitrary-text-size", rule, {
  valid: [
    `const a = <span className="text-meta text-body text-xs text-sm text-title" />;`,
    `const a = <span className="text-[var(--mock-muted)] text-[#171717]" />;`,
    `const a = <span className="text-left text-center" />;`,
    `const a = <span className="size-[34px] h-[13px] w-[11px]" />;`,
    `const a = "text-[length:var(--size)]";`,
  ],
  invalid: [
    { code: `const a = <p className="text-[11.5px] text-muted-foreground" />;`, errors: [arbitrary] },
    { code: `const a = <p className="text-[13px]" />;`, errors: [arbitrary] },
    { code: `const a = <p className="sm:text-[11px] font-medium" />;`, errors: [arbitrary] },
    { code: `const a = <p className="min-[520px]:text-[10px]" />;`, errors: [arbitrary] },
    { code: `const a = \`text-[12px] \${x}\`;`, errors: [arbitrary] },
    { code: `const a = cn("base", ok && "text-[9px]");`, errors: [arbitrary] },
  ],
});
