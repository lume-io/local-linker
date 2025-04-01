import * as fs from "fs";
import * as path from "path";
import * as chokidar from "chokidar";
import { LocalPackages } from "./types";
import { Logger } from "./logger";
import { PackageManagerCommands } from "./package-manager";
import { buildPackage } from "./builder";
import { linkPackage } from "./linker";

/**
 * Interface for watch path configuration
 */
interface WatchPath {
  name: string;
  path: string[];
}

/**
 * Get watch patterns for a package
 */
function getWatchPatterns(packagePath: string, patterns?: string[]): string[] {
  // If custom patterns are specified, use those
  if (patterns && patterns.length > 0) {
    return patterns.map((pattern) =>
      path.isAbsolute(pattern) ? pattern : path.join(packagePath, pattern)
    );
  }

  // Otherwise use defaults
  const srcPath = path.join(packagePath, "src");
  if (fs.existsSync(srcPath)) {
    return [path.join(srcPath, "**/*")];
  }

  return [path.join(packagePath, "**/*")];
}

/**
 * Start watching for changes in local packages
 */
export function watchPackages(
  localPackages: LocalPackages,
  pmCommands: PackageManagerCommands,
  logger: Logger
): void {
  if (Object.keys(localPackages).length === 0) {
    return;
  }

  // Configure watch paths for each package
  const watchPaths: WatchPath[] = Object.entries(localPackages).map(
    ([name, config]) => {
      const absPath = path.isAbsolute(config.path)
        ? config.path
        : path.resolve(process.cwd(), config.path);

      const patterns = getWatchPatterns(absPath, config.watchPatterns);

      return { name, path: patterns };
    }
  );

  logger.info("\nStarting watch mode...");

  // Flatten all patterns for chokidar
  const allPatterns = watchPaths.flatMap((wp) => wp.path);

  // Configure ignored patterns
  const ignored = [
    /(^|[\/\\])\../, // ignore dotfiles
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.git/**",
  ];

  // Show what we're watching
  logger.info("Watching for changes in:");
  watchPaths.forEach((p) => {
    logger.info(`  - ${p.name}: ${p.path.join(", ")}`);
  });

  // Set up the watcher
  const watcher = chokidar.watch(allPatterns, {
    ignored,
    persistent: true,
    ignoreInitial: true,
  });

  // Debounce timers for each package
  const debounce: Record<string, NodeJS.Timeout> = {};

  logger.success("\nWatch mode started. Press Ctrl+C to stop.");

  // Handle file changes
  watcher.on("change", (changedPath: string) => {
    logger.info(`\nChange detected: ${changedPath}`);

    // Find which package was changed
    const matchedPackage = watchPaths.find((wp) =>
      wp.path.some((pattern) => {
        // Handle glob patterns by checking if the changed path starts with
        // the directory part of the pattern
        const dirPart = pattern.split("*")[0];
        return changedPath.startsWith(dirPart);
      })
    );

    if (matchedPackage) {
      const { name } = matchedPackage;

      // Debounce by package name
      clearTimeout(debounce[name]);
      debounce[name] = setTimeout(() => {
        logger.info(`Rebuilding and relinking ${name}...`);

        const config = localPackages[name];

        buildPackage(name, config, pmCommands, logger);
        linkPackage(name, config, pmCommands, logger);
      }, 500);
    }
  });

  // Handle errors
  watcher.on("error", (error) => {
    logger.error(`Watcher error: ${error}`);
  });
}
