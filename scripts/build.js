#!/usr/bin/env node

/**
 * NeuroLint CLI Build Script
 * Creates a production-ready distribution bundle
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("🔨 Building NeuroLint CLI...");
console.log("============================");

// Configuration
const buildConfig = {
  srcDir: path.join(__dirname, "..", "src"),
  distDir: path.join(__dirname, "..", "dist"),
  entryPoint: path.join(__dirname, "..", "src", "index.js"),
  outputFile: path.join(__dirname, "..", "dist", "cli-production.js"),
};

// Clean dist directory
if (fs.existsSync(buildConfig.distDir)) {
  fs.rmSync(buildConfig.distDir, { recursive: true });
}
fs.mkdirSync(buildConfig.distDir, { recursive: true });

// Create production bundle
console.log("�� Creating production bundle...");

// Read the main entry point
const mainContent = fs.readFileSync(buildConfig.entryPoint, "utf8");

// Bundle all dependencies into a single file
const bundledCode = createBundle(buildConfig.srcDir);

// Write the production file
const productionCode = `#!/usr/bin/env node

/**
 * NeuroLint CLI - Production Bundle
 * Generated: ${new Date().toISOString()}
 */

${bundledCode}
`;

fs.writeFileSync(buildConfig.outputFile, productionCode);

// Make executable
try {
  execSync(`chmod +x "${buildConfig.outputFile}"`);
} catch (error) {
  // Ignore chmod errors on Windows
}

console.log("✅ Build completed successfully!");
console.log(`📁 Output: ${buildConfig.outputFile}`);

// Verify the build
console.log("🔍 Verifying build...");
try {
  execSync(`node "${buildConfig.outputFile}" --version`, { stdio: "pipe" });
  console.log("✅ Build verification passed!");
} catch (error) {
  console.error("❌ Build verification failed:", error.message);
  process.exit(1);
}

function createBundle(srcDir) {
  const files = getAllJSFiles(srcDir);
  let bundleCode = "";

  // Add a simple module system
  bundleCode += `
// Simple module system for bundled CLI
const __modules = {};
const __require = (path) => {
  if (__modules[path]) {
    return __modules[path].exports;
  }
  throw new Error('Module not found: ' + path);
};

`;

  // Process each file
  for (const file of files) {
    const relativePath = path.relative(srcDir, file);
    const content = fs.readFileSync(file, "utf8");

    // Transform require statements to use our module system
    const transformedContent = transformRequires(content, relativePath);

    bundleCode += `
// Module: ${relativePath}
__modules['${relativePath}'] = { exports: {} };
(function(module, exports, require) {
${transformedContent}
}(__modules['${relativePath}'], __modules['${relativePath}'].exports, __require));

`;
  }

  // Add the main execution
  bundleCode += `
// Execute main module
try {
  __require('index.js');
} catch (error) {
  console.error('CLI Error:', error.message);
  process.exit(1);
}
`;

  return bundleCode;
}

function getAllJSFiles(dir) {
  const files = [];

  function scan(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scan(fullPath);
      } else if (item.endsWith(".js")) {
        files.push(fullPath);
      }
    }
  }

  scan(dir);
  return files;
}

function transformRequires(content, currentFile) {
  // Remove shebang lines from content (except main file)
  if (currentFile !== "index.js") {
    content = content.replace(/^#!/gm, "//");
  }

  // Transform relative requires to use our module paths
  return content.replace(
    /require\(['"]([^'"]+)['"]\)/g,
    (match, modulePath) => {
      if (modulePath.startsWith("./") || modulePath.startsWith("../")) {
        // Resolve relative path
        const resolvedPath = path.resolve(
          path.dirname(currentFile),
          modulePath,
        );
        const relativePath = path.relative(".", resolvedPath);

        // Ensure .js extension
        let finalPath = relativePath;
        if (!finalPath.endsWith(".js")) {
          finalPath += ".js";
        }

        return `__require('${finalPath}')`;
      } else if (modulePath.startsWith("..")) {
        // Handle package.json require
        if (modulePath === "../package.json") {
          return `{ name: '@neurolint/cli', version: '1.0.0' }`;
        }
        return match;
      } else {
        // External module, keep as-is
        return match;
      }
    },
  );
}

console.log("🎉 Build process completed!");
console.log();
console.log("Next steps:");
console.log(`• Test: node ${buildConfig.outputFile} --help`);
console.log(`• Install: npm install -g .`);
console.log(`• Package: npm pack`);
