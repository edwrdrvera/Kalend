/**
 * Custom ESLint rule: `access-control/scoped-query`.
 *
 * The app's db client bypasses RLS (see `src/db/CLAUDE.md`), so the only thing
 * keeping one user's rows away from another is the `eq(<table>.user_id,
 * user.id)` filter hand-written into every query. A query over `events`,
 * `tasks`, or `categories` whose `.where(...)` does not contain that filter is
 * a potential cross-tenant leak. This rule flags it at lint time so a forgotten
 * filter fails CI instead of shipping.
 *
 * It is deliberately safe-and-noisy rather than quiet-and-dangerous. It matches
 * the owner filter only when it is written inline inside the `.where(...)` call
 * (directly or nested in `and(...)`). A filter hoisted into a variable or built
 * in an array is invisible to pure AST matching, so those legitimately-scoped
 * queries would report. That is the correct failure direction: it never stays
 * silent on a query it cannot prove is scoped. Inline the filter to satisfy it.
 * The rule cannot be disabled inline (see eslint.config.mjs); a genuine
 * exception means changing this rule, where the change gets reviewed.
 */

const TARGET_TABLES = new Set(["events", "tasks", "categories"]);

// Walk down the method chain from a `.where(...)` call to the queried table:
// `.from(X)` for selects, `.update(X)` / `.delete(X)` for writes. Returns the
// table identifier name, or null when it cannot be resolved statically.
function findQueryTable(whereCall) {
  let cur = whereCall.callee.object;
  while (cur) {
    if (cur.type === "CallExpression" && cur.callee.type === "MemberExpression") {
      const prop = cur.callee.property;
      const name = prop.type === "Identifier" ? prop.name : null;
      if ((name === "from" || name === "update" || name === "delete") && cur.arguments.length > 0) {
        const arg = cur.arguments[0];
        return arg.type === "Identifier" ? arg.name : null;
      }
      cur = cur.callee.object;
    } else if (cur.type === "MemberExpression") {
      cur = cur.object;
    } else {
      return null;
    }
  }
  return null;
}

// Does the where-argument subtree contain eq(<table>.user_id, ...) anywhere?
// Recurses so it sees the filter through `and(...)` nesting.
function containsUserIdEq(node, table) {
  if (!node || typeof node !== "object") return false;
  if (
    node.type === "CallExpression" &&
    node.callee.type === "Identifier" &&
    node.callee.name === "eq"
  ) {
    const first = node.arguments[0];
    if (
      first &&
      first.type === "MemberExpression" &&
      first.object.type === "Identifier" &&
      first.object.name === table &&
      first.property.type === "Identifier" &&
      first.property.name === "user_id"
    ) {
      return true;
    }
  }
  for (const key of Object.keys(node)) {
    if (key === "parent") continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const c of child) {
        if (c && typeof c === "object" && c.type && containsUserIdEq(c, table)) return true;
      }
    } else if (child && typeof child === "object" && child.type) {
      if (containsUserIdEq(child, table)) return true;
    }
  }
  return false;
}

const scopedQuery = {
  meta: {
    type: "problem",
    docs: { description: "Drizzle queries over user-owned tables must be scoped by user_id" },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.type !== "MemberExpression") return;
        const prop = node.callee.property;
        if (!(prop.type === "Identifier" && prop.name === "where")) return;

        const table = findQueryTable(node);
        if (table === null || !TARGET_TABLES.has(table)) return;

        const whereArg = node.arguments[0];
        if (!whereArg) return;

        if (!containsUserIdEq(whereArg, table)) {
          context.report({
            node,
            message: `Query over "${table}" is missing an eq(${table}.user_id, user.id) owner filter in its .where(...). This client bypasses RLS, so an unscoped query can leak another user's rows. Add the filter inline, or disable this rule on the line with a comment explaining why the query is safe.`,
          });
        }
      },
    };
  },
};

const plugin = { rules: { "scoped-query": scopedQuery } };

export default plugin;
