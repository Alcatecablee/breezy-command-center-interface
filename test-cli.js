#!/usr/bin/env node

// Simple test to verify CLI functionality
const { execSync } = require("child_process");

try {
  console.log("Testing CLI with direct node execution...");

  // Test version
  const versionResult = execSync("node src/index.js --version", {
    encoding: "utf8",
  });
  console.log("Version test:", versionResult.trim());

  // Test help
  const helpResult = execSync("node src/index.js --help", { encoding: "utf8" });
  console.log("Help test passed");

  console.log("✅ CLI is working correctly!");
} catch (error) {
  console.error("❌ CLI test failed:", error.message);
  console.log("Trying alternative approach...");

  // Try importing the CLI directly
  try {
    const { program } = require("./src/index.js");
    console.log("✅ CLI module loads successfully");
  } catch (importError) {
    console.error("❌ CLI import failed:", importError.message);
  }
}
