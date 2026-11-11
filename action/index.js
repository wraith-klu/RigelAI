/**
 * CodeSentinel AI — GitHub Action Runner (index.js)
 * =================================================
 * Entrypoint for Node.js environments. Spawns review_bot.py with environment
 * parameters or directly submits PR diffs to the Rigel AI API endpoint.
 */

const { spawn } = require("child_process");
const path = require("path");

function run() {
  console.log("🛡️ Launching CodeSentinel AI Review Bot...");

  const pythonScript = path.join(__dirname, "review_bot.py");
  const pythonCmd = process.platform === "win32" ? "python" : "python3";

  const child = spawn(pythonCmd, [pythonScript], {
    stdio: "inherit",
    env: { ...process.env },
  });

  child.on("error", (err) => {
    console.error("❌ Failed to start CodeSentinel Python process:", err.message);
    process.exit(1);
  });

  child.on("close", (code) => {
    if (code !== 0) {
      console.error(`⚠️ CodeSentinel review finished with exit code ${code}`);
      process.exit(code);
    }
    console.log("✅ CodeSentinel PR Review completed successfully.");
    process.exit(0);
  });
}

if (require.main === module) {
  run();
}

module.exports = { run };
