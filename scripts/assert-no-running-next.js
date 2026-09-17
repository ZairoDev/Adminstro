#!/usr/bin/env node

const { execSync } = require("child_process");

function isCi() {
  return (
    process.env.CI === "true" ||
    process.env.CI === "1" ||
    process.env.GITHUB_ACTIONS === "true" ||
    Boolean(process.env.JENKINS_URL)
  );
}

if (isCi()) {
  process.exit(0);
}

if (process.env.NEXT_DIST_DIR && process.env.NEXT_DIST_DIR !== ".next") {
  process.exit(0);
}

function listConflictingProcesses() {
  let output = "";
  try {
    output = execSync("ps -A -o pid=,command=", { encoding: "utf8" });
  } catch {
    return [];
  }

  const ignorePids = new Set([String(process.pid), String(process.ppid)]);

  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      const match = line.match(/^(\d+)\s+(.*)$/);
      if (!match) return false;

      const pid = match[1];
      const cmd = match[2];
      if (ignorePids.has(pid)) return false;
      if (cmd.includes("assert-no-running-next")) return false;

      return (
        /(^|[/\s])tsx(\.js)?\s+\S*socket\.ts/.test(cmd) ||
        /(^|[/\s])next(\.js)?\s+dev\b/.test(cmd) ||
        /(^|[/\s])next(\.js)?\s+start\b/.test(cmd)
      );
    });
}

const running = listConflictingProcesses();
if (running.length === 0) {
  process.exit(0);
}

console.error(`
Cannot run \`next build\` while the app server is using the same .next folder.

Dev (\`npm run dev\`) and a production build both write into .next. When they overlap,
static generation fails with missing chunks such as:
  - Cannot find module './61682.js'
  - Cannot find module './chunks/vendor-chunks/next.js'
  - Cannot find module for page: /_document

Stop the running server (Ctrl+C), then run \`npm run build\` again.

Still running:
${running.map((line) => `  ${line}`).join("\n")}
`);
process.exit(1);
