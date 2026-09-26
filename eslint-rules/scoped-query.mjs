/**
 * Custom ESLint rule: `access-control/scoped-query`.
 *
 * The app's db client bypasses RLS (see `src/db/CLAUDE.md`), so the only thing
 * keeping one user's rows away from another is the `eq(<table>.user_id,
 * user.id)` filter hand-written into every query. A query over `events`,
 * `tasks`, or `categories` that does not reach a `.where(...)` holding that
 * filter is a potential cross-tenant leak, and that includes a query with no
 * `.where` at all. This rule flags it at lint time so a forgotten
 * filter fails CI instead of shipping.
 *
 * It is deliberately safe-and-noisy rather than quiet-and-dangerous. It matches
 * the owner filter only when it is written inline inside the `.where(...)` call
 * of the same chain, directly or nested in `and(...)`. Under `or(...)` or
 * `not(...)` it would no longer restrict the rows, so it does not count.
 * `db.query.<table>` and `db.execute(...)` are reported outright because the
 * filter inside them cannot be checked. A filter hoisted into a variable or built
 * in an array is invisible to pure AST matching, so those legitimately-scoped
 * queries would report. That is the correct failure direction: it never stays
 * silent on a query it cannot prove is scoped. Inline the filter to satisfy it.
 * The rule cannot be disabled inline (see eslint.config.mjs); a genuine
 * exception means changing this rule, where the change gets reviewed.
 */

const TARGET_TABLES = new Set(["events", "tasks", "categories"]);

const ownerFilterHint = (table) =>
  `Query over "${table}" is missing an eq(${table}.user_id, user.id) owner filter in its .where(...), at the top level or inside and(...). This client bypasses RLS, so an unscoped query can leak another user's rows.`;

function findVariable(scope, name) {
  for (let s = scope; s; s = s.upper) {
    const variable = s.set.get(name);
    if (variable) return variable;
  }
  return null;
}

// Resolves a table reference to its schema name through the forms an agent
// is likely to write: tasks, schema.tasks, an aliased import, a local alias,
// alias(tasks, "t"), and a type cast.
function tableName(node, scope, seen = new Set()) {
  if (!node || seen.has(node)) return null;
  seen.add(node);
  if (node.type === "TSAsExpression" || node.type === "TSNonNullExpression" || node.type === "TSSatisfiesExpression") {
    return tableName(node.expression, scope, seen);
  }
  if (node.type === "MemberExpression" && node.property.type === "Identifier") {
    return TARGET_TABLES.has(node.property.name) ? node.property.name : null;
  }
  if (node.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === "alias") {
    return tableName(node.arguments[0], scope, seen);
  }
  if (node.type !== "Identifier") return null;
  if (TARGET_TABLES.has(node.name)) return node.name;
  const def = findVariable(scope, node.name)?.defs[0];
  if (def?.type === "ImportBinding" && def.node.type === "ImportSpecifier") {
    const imported = def.node.imported.name ?? def.node.imported.value;
    return TARGET_TABLES.has(imported) ? imported : null;
  }
  if (def?.type === "Variable" && def.node.init) return tableName(def.node.init, scope, seen);
  return null;
}

// The table a query starts from: db.select().from(X), db.update(X), db.delete(X).
function queryRootTable(call, scope) {
  if (call.callee.type !== "MemberExpression" || call.callee.property.type !== "Identifier") return null;
  const table = tableName(call.arguments[0], scope);
  if (table === null) return null;
  const method = call.callee.property.name;
  const receiver = call.callee.object;
  if (method === "from") {
    const isSelect =
      receiver.type === "CallExpression" &&
      receiver.callee.type === "MemberExpression" &&
      receiver.callee.property.type === "Identifier" &&
      receiver.callee.property.name.startsWith("select");
    return isSelect ? table : null;
  }
  if (method === "update" || method === "delete") {
    return receiver.type === "Identifier" || receiver.type === "MemberExpression" ? table : null;
  }
  return null;
}

// Climb the method chain above the query root and return its .where(...) call.
function chainedWhere(root) {
  let node = root;
  while (
    node.parent?.type === "MemberExpression" &&
    node.parent.object === node &&
    node.parent.parent?.type === "CallExpression" &&
    node.parent.parent.callee === node.parent
  ) {
    const call = node.parent.parent;
    if (node.parent.property.type === "Identifier" && node.parent.property.name === "where") return call;
    node = call;
  }
  return null;
}

const isMember = (node, property) =>
  node?.type === "MemberExpression" && node.property.type === "Identifier" && node.property.name === property;

// eq(<table>.user_id, user.id): the column on the queried table, compared to
// the authenticated user from withUser, never a value taken from the request.
function isOwnerEq(node, table, scope) {
  const [column, value] = node.arguments;
  return (
    isMember(column, "user_id") &&
    tableName(column.object, scope) === table &&
    isMember(value, "id") &&
    value.object.type === "Identifier" &&
    value.object.name === "user"
  );
}

function isScoped(node, table, scope) {
  if (node?.type !== "CallExpression" || node.callee.type !== "Identifier") return false;
  if (node.callee.name === "eq") return isOwnerEq(node, table, scope);
  if (node.callee.name === "and") return node.arguments.some((arg) => isScoped(arg, table, scope));
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
        const scope = context.sourceCode.getScope(node);
        const table = queryRootTable(node, scope);
        if (table !== null) {
          const where = chainedWhere(node);
          if (!where || !isScoped(where.arguments[0], table, scope)) {
            context.report({ node, message: ownerFilterHint(table) });
          }
          return;
        }
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.property.type === "Identifier" &&
          node.callee.property.name === "execute"
        ) {
          context.report({
            node,
            message: "Raw SQL cannot be checked for an owner filter. Use db.select()/update()/delete() with .where(eq(<table>.user_id, user.id)).",
          });
        }
      },
      MemberExpression(node) {
        if (
          node.property.type === "Identifier" &&
          TARGET_TABLES.has(node.property.name) &&
          node.object.type === "MemberExpression" &&
          node.object.property.type === "Identifier" &&
          node.object.property.name === "query"
        ) {
          context.report({
            node,
            message: `db.query.${node.property.name} hides its filter from this check. Use db.select().from(${node.property.name}).where(eq(${node.property.name}.user_id, user.id)).`,
          });
        }
      },
    };
  },
};

const plugin = { rules: { "scoped-query": scopedQuery } };

export default plugin;
