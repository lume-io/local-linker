#!/usr/bin/env node

import { readConfig, loadToolConfig } from "./config";
import { Logger, log, colors } from "./logger";
import {
  detectPackageManager,
  PackageManagerCommands,
} from "./package-manager";
import { linkAllPackages, linkRecursiveDependencies } from "./linker";
import { watchPackages } from "./watcher";

function main(): void {
  const args = process.argv.slice(2);

  // Show help if requested
  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    return;
  }

  // Load configuration
  const localPackages = readConfig();
  if (Object.keys(localPackages).length === 0) {
    return;
  }

  // Load tool configuration
  const toolConfig = loadToolConfig();

  // Determine if we should use spinners
  const useSpinner = args.includes("--no-spinner")
    ? false
    : toolConfig.useSpinner !== false;

  // Create logger
  const logger = new Logger(useSpinner);

  // Detect package manager
  const packageManager = detectPackageManager();
  logger.info(`Detected package manager: ${packageManager}`);

  // Create package manager commands
  const pmCommands = new PackageManagerCommands(packageManager, logger);

  // Determine if we should resolve dependencies
  const resolveDependencies =
    args.includes("--deps") ||
    args.includes("-d") ||
    toolConfig.resolveDependencies === true;

  // Determine if we should recursively link dependencies
  const recursive =
    args.includes("--recursive") ||
    args.includes("-r") ||
    toolConfig.recursiveLinks === true;

  // Link all packages
  const success = linkAllPackages(
    localPackages,
    pmCommands,
    logger,
    resolveDependencies
  );

  // Handle recursive linking if requested
  if (success && recursive) {
    linkRecursiveDependencies(localPackages, pmCommands, logger).then(() => {
      // Start watch mode if requested
      if (args.includes("--watch") || args.includes("-w")) {
        watchPackages(localPackages, pmCommands, logger);
      }
    });
  } else if (success && (args.includes("--watch") || args.includes("-w"))) {
    // Start watch mode if requested
    watchPackages(localPackages, pmCommands, logger);
  }
}

// Also update the help message:
function showHelp(): void {
  console.log(`
${colors.cyan}@lume-io/local-linker${colors.reset}

A magical tool for easily linking local packages in your Node.js projects.

${colors.yellow}Usage:${colors.reset}
  local-linker               Link all packages defined in .localpackages
  local-linker --watch, -w   Link packages and watch for changes
  local-linker --deps, -d    Resolve dependencies and build in the correct order
  local-linker --recursive, -r  Recursively link dependencies in all linked packages
  local-linker --help, -h    Show this help message

${colors.yellow}Configuration:${colors.reset}
  Create a .localpackages file in your project root with the format:
  
  package-name = /path/to/package [build-command] [watch:[pattern1,pattern2]]
  
  Examples:
  ui-library = ../ui-lib
  api-client = /path/to/api-client [npm run build:dev]
  utils = ../utils [pnpm compile] [watch:src/**/*.ts,tests/**/*.ts]
  
  Lines starting with # are treated as comments.
  
${colors.yellow}Additional Configuration:${colors.reset}
  You can also configure options in your package.json:
  
  {
    "localLinker": {
      "useSpinner": true,
      "resolveDependencies": true,
      "recursiveLinks": true
    }
  }
  `);
}

// Run the main function
main();
