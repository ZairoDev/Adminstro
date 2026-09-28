/**
 * Export role → route patterns from middleware.ts into
 * docs/crm-agent/generated/role-access.json
 */
import fs from "fs";
import path from "path";

const middlewarePath = path.join(process.cwd(), "src/middleware.ts");
const outDir = path.join(process.cwd(), "docs/crm-agent/generated");
const outFile = path.join(outDir, "role-access.json");

function extractRoleAccess(source: string): Record<string, string[]> {
  const marker = "const roleAccess";
  const start = source.indexOf(marker);
  if (start < 0) throw new Error("roleAccess not found");

  const assign = source.indexOf("=", start);
  const braceStart = source.indexOf("{", assign);
  let depth = 0;
  let end = braceStart;
  for (let i = braceStart; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }

  const block = source.slice(braceStart + 1, end - 1);
  const roles: Record<string, string[]> = {};

  // Split top-level role entries by matching "RoleKey: [" ... "],"
  const roleRe =
    /(?:^|\n)\s*(?:\"([^\"]+)\"|'([^']+)'|([A-Za-z_][A-Za-z0-9_()\-]*))\s*:\s*\[/g;
  const matches: Array<{ role: string; bodyStart: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = roleRe.exec(block)) !== null) {
    const role = m[1] || m[2] || m[3];
    if (!role) continue;
    matches.push({ role, bodyStart: m.index + m[0].length });
  }

  for (let i = 0; i < matches.length; i++) {
    const { role, bodyStart } = matches[i]!;
    // Find matching closing bracket for this array
    let depthArr = 1;
    let j = bodyStart;
    for (; j < block.length; j++) {
      const ch = block[j];
      if (ch === "[") depthArr += 1;
      else if (ch === "]") {
        depthArr -= 1;
        if (depthArr === 0) break;
      }
    }
    const body = block.slice(bodyStart, j);
    const routes: string[] = [];
    const stringRoutes = body.matchAll(/"(\/[^"]*)"/g);
    for (const sm of stringRoutes) {
      if (sm[1]) routes.push(sm[1]);
    }
    const regexRoutes = body.matchAll(/\/(\^[^\/]*\$)\//g);
    for (const rm of regexRoutes) {
      if (rm[1]) routes.push(`/${rm[1]}/`);
    }
    roles[role] = Array.from(new Set(routes));
  }

  return roles;
}

function main() {
  const source = fs.readFileSync(middlewarePath, "utf8");
  const roles = extractRoleAccess(source);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: "src/middleware.ts roleAccess",
        roleCount: Object.keys(roles).length,
        roles,
      },
      null,
      2,
    ),
  );
  console.log(
    `Wrote ${outFile} (${Object.keys(roles).length} roles)`,
  );
}

main();
