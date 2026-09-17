#!/usr/bin/env node

const { execSync } = require("child_process");

function listConflictingProcesses() {
  try {
    return execSync('pgrep -fl "tsx socket.ts|next dev|next start"', {
      encoding: "utf8",
    })
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

if (process.env.NEXT_DIST_DIR && process.env.NEXT_DIST_DIR !== ".next") {
  process.exit(0);
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
