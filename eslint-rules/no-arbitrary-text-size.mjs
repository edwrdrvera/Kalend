/**
 * Custom ESLint rule: `no-arbitrary-text-size`.
 *
 * Every text size in the app comes from the type scale in `@theme`
 * (`text-meta`, `text-body`, `text-xs`, `text-sm`, `text-title`), so the
 * library's style names stay the only sizes. An arbitrary `text-[<n>px]`
 * class puts a new size next to them. This rule flags any class string that
 * holds one, in string and template literals. Its file exclusions live in
 * `eslint.config.mjs`: the landing page keeps its own sizes, and the hour
 * gutter and mini calendar keep their 9px and 10px labels.
 */

const ARBITRARY_TEXT_SIZE = /(?<![\w-])text-\[\d+(?:\.\d+)?px\]/;

const MESSAGE =
  "Arbitrary text size. Use a type-scale class from the @theme block in src/app/globals.css (text-meta, text-body, text-xs, text-sm, or text-title) instead.";

const noArbitraryTextSize = {
  meta: {
    type: "problem",
    docs: { description: "Disallow arbitrary px text sizes outside the type scale." },
    schema: [],
    messages: { arbitrary: MESSAGE },
  },
  create(context) {
    const check = (node, text) => {
      if (ARBITRARY_TEXT_SIZE.test(text)) context.report({ node, messageId: "arbitrary" });
    };
    return {
      Literal(node) {
        if (typeof node.value === "string") check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value.raw);
      },
    };
  },
};

const plugin = { rules: { "no-arbitrary-text-size": noArbitraryTextSize } };

export default plugin;
