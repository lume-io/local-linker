import * as path from "path";
import { LocalPackages, PackageConfig, PackageInfo } from "./types";
import { Logger } from "./logger";
import {
  detectPackageManagerForPath,
  PackageManagerCommands,
} from "./package-manager";
import { buildPackage } from "./builder";
import { buildDependencyGraph, getTopologicalOrder } from "./dependency-graph";
import { CONFIG_FILE, readConfig } from "./config";
import * as fs from "fs";

/**
 * Link a package to the current project
 */
export function linkPackage(
  packageName: string,
  config: LocalPackages[string],
  mainPmCommands: PackageManagerCommands,
  logger: Logger
): boolean {
  const absPath = path.isAbsolute(config.path)
    ? config.path
    : path.resolve(process.cwd(), config.path);

  // Detect package manager specific to this package
  const packageManager = detectPackageManagerForPath(absPath);
  const packagePmCommands =
    packageManager === mainPmCommands.getPackageManager()
      ? mainPmCommands
      : new PackageManagerCommands(packageManager, logger);

  // Create a global link in the package using its own package manager
  const globalLinkSuccess = packagePmCommands.createGlobalLink(
    absPath,
    packageName
  );
  if (!globalLinkSuccess) {
    return false;
  }

  // Link the global package to the current project using the main project's package manager
  return mainPmCommands.linkToProject(packageName);
}

/**
 * Link all local packages
 */
export function linkAllPackages(
  localPackages: LocalPackages,
  pmCommands: PackageManagerCommands,
  logger: Logger,
  resolveDependencies: boolean = false
): boolean {
  if (Object.keys(localPackages).length === 0) {
    return false;
  }

  // Determine the order to process packages
  let packageOrder: string[];

  if (resolveDependencies) {
    logger.info("Resolving dependency order...");
    const graph = buildDependencyGraph(localPackages, logger);
    packageOrder = getTopologicalOrder(graph, logger);

    // Check if we got all packages in the order
    const missingPackages = Object.keys(localPackages).filter(
      (name) => !packageOrder.includes(name)
    );
    if (missingPackages.length > 0) {
      logger.warn(
        `Some packages were not included in dependency resolution: ${missingPackages.join(
          ", "
        )}`
      );
      packageOrder = [...packageOrder, ...missingPackages];
    }

    logger.info(`Processing packages in order: ${packageOrder.join(" → ")}`);
  } else {
    // No dependency resolution, just use the keys
    packageOrder = Object.keys(localPackages);
  }

  let allSuccessful = true;

  // Process packages in the determined order
  for (const packageName of packageOrder) {
    const config = localPackages[packageName];

    logger.info(`\nProcessing ${packageName}...`);

    // Build the package
    const buildSuccess = buildPackage(packageName, config, pmCommands, logger);
    if (!buildSuccess) {
      allSuccessful = false;
      continue;
    }

    // Link the package
    const linkSuccess = linkPackage(packageName, config, pmCommands, logger);
    if (!linkSuccess) {
      allSuccessful = false;
    }
  }

  if (allSuccessful) {
    logger.success("\nAll local packages linked successfully!");
  } else {
    logger.warn("\nSome packages were not linked successfully.");
  }

  return allSuccessful;
}

/**
 * Recursively link dependencies in all linked packages
 */
export async function linkRecursiveDependencies(
  localPackages: LocalPackages,
  pmCommands: PackageManagerCommands,
  logger: Logger
): Promise<void> {
  logger.info("\nChecking for recursive dependencies...");

  // Track packages we've already processed to avoid loops
  const processed = new Set<string>();

  // Process each package
  for (const [packageName, config] of Object.entries(localPackages)) {
    await processPackageRecursively(
      packageName,
      config,
      localPackages,
      pmCommands,
      logger,
      processed
    );
  }

  logger.success("Recursive dependency linking complete");
}

/**
 * Process a single package and its dependencies recursively
 */
async function processPackageRecursively(
  packageName: string,
  config: PackageConfig,
  rootPackages: LocalPackages,
  pmCommands: PackageManagerCommands,
  logger: Logger,
  processed: Set<string>,
  depth: number = 0
): Promise<void> {
  // Avoid infinite recursion
  const packageKey = `${packageName}:${config.path}`;
  if (processed.has(packageKey)) {
    return;
  }

  processed.add(packageKey);

  const absPath = path.isAbsolute(config.path)
    ? config.path
    : path.resolve(process.cwd(), config.path);

  // Check if the package has its own .localpackages file
  const localPackagesPath = path.join(absPath, CONFIG_FILE);
  if (!fs.existsSync(localPackagesPath)) {
    return;
  }

  // Change to the package directory to read its .localpackages file
  const currentDir = process.cwd();
  process.chdir(absPath);

  logger.info(
    `${" ".repeat(depth * 2)}📦 Checking dependencies in ${packageName}...`
  );

  // Read package's local dependencies
  const packageLocalDeps = readConfig();

  // Change back to original directory
  process.chdir(currentDir);

  if (Object.keys(packageLocalDeps).length === 0) {
    return;
  }

  logger.info(
    `${" ".repeat(depth * 2)}Found ${
      Object.keys(packageLocalDeps).length
    } local dependencies in ${packageName}`
  );

  // Link each dependency
  for (const [depName, depConfig] of Object.entries(packageLocalDeps)) {
    // Resolve the dependency path relative to the original working directory
    const relativePath = path.isAbsolute(depConfig.path)
      ? depConfig.path
      : path.resolve(absPath, depConfig.path);

    const resolvedConfig = {
      ...depConfig,
      path: relativePath,
    };

    // Build the dependency
    logger.info(
      `${" ".repeat((depth + 1) * 2)}Building ${depName} for ${packageName}...`
    );
    buildPackage(depName, resolvedConfig, pmCommands, logger);

    // Link the dependency to the package
    logger.info(
      `${" ".repeat((depth + 1) * 2)}Linking ${depName} to ${packageName}...`
    );

    // Create a global link in the dependency package
    pmCommands.createGlobalLink(resolvedConfig.path, depName);

    // Change to the package directory to link the dependency
    process.chdir(absPath);
    pmCommands.linkToProject(depName);
    process.chdir(currentDir);

    // Process this dependency recursively
    await processPackageRecursively(
      depName,
      resolvedConfig,
      rootPackages,
      pmCommands,
      logger,
      processed,
      depth + 1
    );
  }
}
