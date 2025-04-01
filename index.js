#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const chokidar = require("chokidar");

// Configuration
const CONFIG_FILE = ".localpackages";
let PACKAGE_MANAGER = "npm"; // Default

// Helper function for colored console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Read the local packages configuration file
function readConfig() {
  try {
    const configPath = path.resolve(process.cwd(), CONFIG_FILE);
    if (!fs.existsSync(configPath)) {
      log(
        `No ${CONFIG_FILE} file found. Create one to specify local dependencies.`,
        "yellow"
      );
      log(`Format: package-name = /path/to/package`, "yellow");
      return {};
    }

    const config = fs
      .readFileSync(configPath, "utf8")
      .split("\n")
      .filter((line) => line.trim() && !line.startsWith("#"))
      .reduce((acc, line) => {
        const [packageName, packagePath] = line.split("=").map((s) => s.trim());
        if (packageName && packagePath) {
          acc[packageName] = packagePath;
        }
        return acc;
      }, {});

    if (Object.keys(config).length === 0) {
      log(`No packages defined in ${CONFIG_FILE}`, "yellow");
    } else {
      log(
        `Found ${Object.keys(config).length} local packages in ${CONFIG_FILE}`,
        "green"
      );
    }

    return config;
  } catch (error) {
    log(`Error reading configuration: ${error.message}`, "red");
    return {};
  }
}

// Detect the package manager being used in the project
function detectPackageManager() {
  if (fs.existsSync(path.resolve(process.cwd(), "pnpm-lock.yaml"))) {
    return "pnpm";
  } else if (fs.existsSync(path.resolve(process.cwd(), "yarn.lock"))) {
    return "yarn";
  }
  return "npm"; // Default to npm
}

// Build a package if needed
function buildPackage(packagePath, packageName) {
  const packageJsonPath = path.join(packagePath, "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    log(`⚠️ No package.json found in ${packagePath}`, "red");
    return false;
  }

  let packageJson;
  try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  } catch (error) {
    log(`⚠️ Error parsing package.json: ${error.message}`, "red");
    return false;
  }

  if (packageJson.scripts && packageJson.scripts.build) {
    log(`🔨 Building ${packageName || packageJson.name}...`, "cyan");
    try {
      execSync(`cd "${packagePath}" && ${PACKAGE_MANAGER} run build`, {
        stdio: "inherit",
      });
      return true;
    } catch (error) {
      log(`⚠️ Build failed: ${error.message}`, "red");
      return false;
    }
  }

  return true; // No build script, consider it successful
}

// Link a package using the appropriate package manager
function linkPackage(packageName, packagePath) {
  try {
    // First create a global link in the package
    log(`🔗 Creating global link for ${packageName}...`, "magenta");
    if (PACKAGE_MANAGER === "yarn") {
      execSync(`cd "${packagePath}" && yarn link`, { stdio: "inherit" });
    } else if (PACKAGE_MANAGER === "pnpm") {
      // For pnpm, we'll use a different approach since pnpm link is different
      execSync(`cd "${packagePath}" && pnpm link --global`, {
        stdio: "inherit",
      });
    } else {
      execSync(`cd "${packagePath}" && npm link`, { stdio: "inherit" });
    }

    // Then use that link in the current project
    log(`🔗 Linking ${packageName} to current project...`, "magenta");
    if (PACKAGE_MANAGER === "yarn") {
      execSync(`yarn link "${packageName}"`, { stdio: "inherit" });
    } else if (PACKAGE_MANAGER === "pnpm") {
      execSync(`pnpm link --global "${packageName}"`, { stdio: "inherit" });
    } else {
      execSync(`npm link "${packageName}"`, { stdio: "inherit" });
    }

    log(`✅ Successfully linked ${packageName}`, "green");
    return true;
  } catch (error) {
    log(`⚠️ Error linking ${packageName}: ${error.message}`, "red");
    return false;
  }
}

// Link all local packages
function linkAllPackages() {
  const localPackages = readConfig();

  if (Object.keys(localPackages).length === 0) {
    return false;
  }

  // Detect package manager
  PACKAGE_MANAGER = detectPackageManager();
  log(`📦 Detected package manager: ${PACKAGE_MANAGER}`, "blue");

  let allSuccessful = true;

  for (const [packageName, packagePath] of Object.entries(localPackages)) {
    log(`\n📦 Processing ${packageName}...`, "cyan");

    // Resolve the path - handle both absolute and relative paths
    const absPath = path.isAbsolute(packagePath)
      ? packagePath
      : path.resolve(process.cwd(), packagePath);

    if (!fs.existsSync(absPath)) {
      log(`⚠️ Package path does not exist: ${absPath}`, "red");
      allSuccessful = false;
      continue;
    }

    // Build the package if needed
    const buildSuccess = buildPackage(absPath, packageName);
    if (!buildSuccess) {
      allSuccessful = false;
      continue;
    }

    // Link the package
    const linkSuccess = linkPackage(packageName, absPath);
    if (!linkSuccess) {
      allSuccessful = false;
    }
  }

  if (allSuccessful) {
    log("\n✨ All local packages linked successfully!", "green");
  } else {
    log("\n⚠️ Some packages were not linked successfully.", "yellow");
  }

  return allSuccessful;
}

// Watch mode to automatically rebuild and relink when local packages change
function watchMode() {
  const localPackages = readConfig();

  if (Object.keys(localPackages).length === 0) {
    return;
  }

  const watchPaths = Object.entries(localPackages).map(([name, dir]) => {
    const absPath = path.isAbsolute(dir)
      ? dir
      : path.resolve(process.cwd(), dir);

    // Check if src directory exists, otherwise watch the whole package
    const srcPath = path.join(absPath, "src");
    const watchPath = fs.existsSync(srcPath) ? srcPath : absPath;

    return { name, path: watchPath };
  });

  log(`\n👀 Starting watch mode...`, "blue");

  // Watch for changes in the source directories
  const watcher = chokidar.watch(
    watchPaths.map((p) => p.path),
    {
      ignored: [
        /(^|[\/\\])\../, // ignore dotfiles
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**",
      ],
      persistent: true,
    }
  );

  // Debounce rebuild to avoid multiple rebuilds for the same file changes
  const debounce = {};

  log("Watching for changes in:", "cyan");
  watchPaths.forEach((p) => {
    log(`  - ${p.name}: ${p.path}`, "cyan");
  });

  log("\n✅ Watch mode started. Press Ctrl+C to stop.", "green");

  watcher.on("change", (changedPath) => {
    log(`\n📝 Change detected: ${changedPath}`, "yellow");

    // Find which package was changed
    const matchedPackage = watchPaths.find((p) =>
      changedPath.startsWith(p.path)
    );

    if (matchedPackage) {
      const { name } = matchedPackage;

      // Debounce by package name
      clearTimeout(debounce[name]);
      debounce[name] = setTimeout(() => {
        log(`🔄 Rebuilding and relinking ${name}...`, "magenta");

        const packagePath = localPackages[name];
        const absPath = path.isAbsolute(packagePath)
          ? packagePath
          : path.resolve(process.cwd(), packagePath);

        buildPackage(absPath, name);
        linkPackage(name, absPath);
      }, 500);
    }
  });
}

// Show help message
function showHelp() {
  console.log(`
${colors.cyan}Local Package Linker${colors.reset}

A tool for easily linking local packages in your Node.js projects.

${colors.yellow}Usage:${colors.reset}
  local-linker              Link all packages defined in ${CONFIG_FILE}
  local-linker --watch, -w  Link packages and watch for changes
  local-linker --help, -h   Show this help message

${colors.yellow}Configuration:${colors.reset}
  Create a ${CONFIG_FILE} file in your project root with the format:
  
  package-name = /absolute/path/to/package
  another-package = ../relative/path/to/package
  
  Lines starting with # are treated as comments.
  `);
}

// Main function
function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
  } else if (args.includes("--watch") || args.includes("-w")) {
    const success = linkAllPackages();
    if (success) {
      watchMode();
    }
  } else {
    linkAllPackages();
  }
}

main();
