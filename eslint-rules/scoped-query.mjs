/**
 * Custom ESLint rule: `access-control/scoped-query`.
 *
 * The app's db client bypasses RLS (see `src/db/CLAUDE.md`), so the only thing
 * keeping one user's rows away from another is the `eq(<table>.user_id,
 * user.id)` filter hand-written into every query. A query over `events`,
 * `tasks`, `categories`, or `alerts` that does not reach a `.where(...)` holding that
 * filter is a potential cross-tenant leak, and that includes a query with no
 * `.where` at all. An insert into those tables must chain `.values(...)` with
 * `user_id: user.id` written inline in every row, so a row can't be written
 * into another user's account. This rule flags both at lint time so a
 * forgotten owner fails CI instead of shipping.
 *
 * It is deliberately safe-and-noisy rather than quiet-and-dangerous. It matches
 * the owner filter only when it is written inline inside the `.where(...)` call
 * of the same chain, directly or nested in `and(...)`. Under `or(...)` or
 * `not(...)` it would no longer restrict the rows, so it does not count.
 * `db.query.<table>` and `db.execute(...)` are reported outright because the
 * filter inside them cannot be checked. So is a select, update, delete, or
 * insert whose table the rule can't identify, such as a conditional, a
 * parameter, or a property of a runtime object: it fails closed. A filter hoisted into a variable or built
 * in an array is invisible to pure AST matching, so those legitimately-scoped
 * queries would report. That is the correct failure direction: it never stays
 * silent on a query it cannot prove is scoped. Inline the filter to satisfy it.
 * The rule cannot be disabled inline (see eslint.config.mjs); a genuine
 * exception means changing this rule, where the change gets reviewed.
 */

const TARGET_TABLES = new Set(["events", "tasks", "categories", "alerts"]);

const ownerValueHint = (table) =>
  `Insert into "${table}" must set user_id: user.id inline in .values({...}) for every row, with no spread or computed key after it, and an onConflictDoUpdate set may only leave user_id alone or set it to user.id. This client bypasses RLS, so an insert without it can write rows into another user's account.`;

const unknownTableHint = (method) =>
  `This rule can't tell which table this .${method}(...) call uses, so it can't check the owner filter. Pass the table itself (tasks, schema.tasks, or an imported alias), not a variable, parameter, or expression that picks one. If this isn't a database call, rename it or move it out of the folders this rule checks.`;

const ownerFilterHint = (table) =>
  `Query over "${table}" is missing an eq(${table}.user_id, user.id) owner filter in its .where(...), at the top level or inside and(...). This client bypasses RLS, so an unscoped query can leak another user's rows.`;

function findVariable(scope, name) {
  for (let s = scope; s; s = s.upper) {
    const variable = s.set.get(name);
    if (variable) return variable;
  }
  return null;
}

const SAFE = Symbol("safe");
const UNKNOWN = Symbol("unknown");

const isSchemaNamespace = (node, scope) =>
  node.type === "Identifier" && findVariable(scope, node.name)?.defs[0]?.node.type === "ImportNamespaceSpecifier";

function staticKey(member) {
  if (!member.computed) return member.property.type === "Identifier" ? member.property.name : null;
  const key = member.property;
  if (key.type === "Literal" && typeof key.value === "string") return key.value;
  if (key.type === "TemplateLiteral" && key.expressions.length === 0) return key.quasis[0].value.cooked;
  return null;
}

// Resolves a table reference to one of the owned table names, SAFE when it
// provably names some other table, or UNKNOWN. It follows the forms an agent
// is likely to write: tasks, schema.tasks, schema["tasks"], an aliased import,
// a local alias, alias(tasks, "t"), and a type cast. Anything else, such as a
// conditional, a parameter, a call, or a property of a runtime object, is
// UNKNOWN, and the rule reports it rather than guessing.
function resolveTable(node, scope, seen = new Set()) {
  if (!node || seen.has(node)) return UNKNOWN;
  seen.add(node);
  if (node.type === "TSAsExpression" || node.type === "TSNonNullExpression" || node.type === "TSSatisfiesExpression") {
    return resolveTable(node.expression, scope, seen);
  }
  if (node.type === "MemberExpression") {
    const key = staticKey(node);
    if (key !== null && TARGET_TABLES.has(key)) return key;
    return key !== null && isSchemaNamespace(node.object, scope) ? SAFE : UNKNOWN;
  }
  if (node.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === "alias") {
    return resolveTable(node.arguments[0], scope, seen);
  }
  if (node.type !== "Identifier") return UNKNOWN;
  if (TARGET_TABLES.has(node.name)) return node.name;
  const variable = findVariable(scope, node.name);
  if (!variable) return SAFE;
  const def = variable.defs[0];
  if (def?.type === "ImportBinding" && def.node.type === "ImportSpecifier") {
    const imported = def.node.imported.name ?? def.node.imported.value;
    return TARGET_TABLES.has(imported) ? imported : SAFE;
  }
  if (def?.type === "Variable" && def.node.id.type === "Identifier" && def.node.init) {
    return resolveTable(def.node.init, scope, seen);
  }
  return UNKNOWN;
}

const tableName = (node, scope) => {
  const table = resolveTable(node, scope);
  return typeof table === "string" ? table : null;
};

// Where a query starts: db.select().from(X), db.update(X), db.delete(X), or
// db.insert(X). Returns the method and the resolved table, or null when the
// call is not a query root.
function queryRoot(call, scope) {
  if (call.callee.type !== "MemberExpression" || call.callee.property.type !== "Identifier") return null;
  if (call.arguments.length === 0) return null;
  const method = call.callee.property.name;
  const receiver = call.callee.object;
  if (method === "from") {
    const isSelect =
      receiver.type === "CallExpression" &&
      receiver.callee.type === "MemberExpression" &&
      receiver.callee.property.type === "Identifier" &&
      receiver.callee.property.name.startsWith("select");
    if (!isSelect) return null;
  } else if (method !== "update" && method !== "delete" && method !== "insert") {
    return null;
  }
  return { method, table: resolveTable(call.arguments[0], scope) };
}

// Climb the method chain above the query root and return its .<method>(...) call.
function chainedCall(root, method) {
  let node = root;
  while (
    node.parent?.type === "MemberExpression" &&
    node.parent.object === node &&
    node.parent.parent?.type === "CallExpression" &&
    node.parent.parent.callee === node.parent
  ) {
    const call = node.parent.parent;
    if (node.parent.property.type === "Identifier" && node.parent.property.name === method) return call;
    node = call;
  }
  return null;
}

const isMember = (node, property) =>
  node?.type === "MemberExpression" && node.property.type === "Identifier" && node.property.name === property;

const isUserId = (node) =>
  isMember(node, "id") && node.object.type === "Identifier" && node.object.name === "user";

// eq(<table>.user_id, user.id): the column on the queried table, compared to
// the authenticated user from withUser, never a value taken from the request.
function isOwnerEq(node, table, scope) {
  const [column, value] = node.arguments;
  return (
    isMember(column, "user_id") &&
    tableName(column.object, scope) === table &&
    isUserId(value)
  );
}

const isUserIdKey = (prop) =>
  prop.type === "Property" && !prop.computed && (prop.key.name === "user_id" || prop.key.value === "user_id");

// A property that could write user_id: the key itself, a spread, or a computed
// key whose runtime value can't be read here.
const canSetOwner = (prop) => prop.type === "SpreadElement" || prop.computed || isUserIdKey(prop);

// The last property that can write user_id decides the owner, so it must be
// user_id: user.id. With `required`, the object must hold one.
function ownerIsUser(object, required) {
  if (object?.type !== "ObjectExpression") return false;
  const decider = object.properties.findLast(canSetOwner);
  if (decider === undefined) return !required;
  return isUserIdKey(decider) && isUserId(decider.value);
}

function valuesHaveOwner(values) {
  const rows = values?.arguments[0];
  if (rows?.type === "ArrayExpression") {
    return rows.elements.length > 0 && rows.elements.every((row) => ownerIsUser(row, true));
  }
  return ownerIsUser(rows, true);
}

// .onConflictDoUpdate({ set }) rewrites an existing row, so its set may leave
// user_id alone or set it to user.id, and nothing else.
function conflictKeepsOwner(conflict) {
  if (!conflict) return true;
  const config = conflict.arguments[0];
  if (config?.type !== "ObjectExpression" || config.properties.some((prop) => prop.type === "SpreadElement")) return false;
  const set = config.properties.findLast((prop) => !prop.computed && prop.key.name === "set");
  return ownerIsUser(set?.value, false);
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
        const root = queryRoot(node, scope);
        if (root !== null) {
          const { method, table } = root;
          if (table === UNKNOWN) {
            context.report({ node, message: unknownTableHint(method) });
          } else if (table === SAFE) {
            return;
          } else if (method === "insert") {
            if (
              !valuesHaveOwner(chainedCall(node, "values")) ||
              !conflictKeepsOwner(chainedCall(node, "onConflictDoUpdate"))
            ) {
              context.report({ node, message: ownerValueHint(table) });
            }
          } else {
            const where = chainedCall(node, "where");
            if (!where || !isScoped(where.arguments[0], table, scope)) {
              context.report({ node, message: ownerFilterHint(table) });
            }
          }
          return;
        }
        if (isMember(node.callee, "execute")) {
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
