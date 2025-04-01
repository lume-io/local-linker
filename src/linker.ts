import * as path from "path";
import { LocalPackages, PackageInfo } from "./types";
import { Logger } from "./logger";
import { PackageManagerCommands } from "./package-manager";
import { buildPackage } from "./builder";
import { buildDependencyGraph, getTopologicalOrder } from "./dependency-graph";

/**
 * Link a package to the current project
 */
export function linkPackage(
  packageName: string,
  config: LocalPackages[string],
  pmCommands: PackageManagerCommands,
  logger: Logger
): boolean {
  const absPath = path.isAbsolute(config.path)
    ? config.path
    : path.resolve(process.cwd(), config.path);

  // Create a global link in the package
  const globalLinkSuccess = pmCommands.createGlobalLink(absPath, packageName);
  if (!globalLinkSuccess) {
    return false;
  }

  // Link the global package to the current project
  return pmCommands.linkToProject(packageName);
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
