import * as fs from "fs";
import * as path from "path";
import { PackageConfig } from "./types";
import { Logger } from "./logger";
import {
  detectPackageManagerForPath,
  PackageManagerCommands,
} from "./package-manager";

/**
 * Build a package using its build script or a custom command
 */
export function buildPackage(
  packageName: string,
  config: PackageConfig,
  mainPmCommands: PackageManagerCommands,
  logger: Logger
): boolean {
  const absPath = path.isAbsolute(config.path)
    ? config.path
    : path.resolve(process.cwd(), config.path);

  // Check if path exists
  if (!fs.existsSync(absPath)) {
    logger.error(`Package path does not exist: ${absPath}`);
    return false;
  }

  const packageJsonPath = path.join(absPath, "package.json");

  // Check if package.json exists
  if (!fs.existsSync(packageJsonPath)) {
    logger.error(`No package.json found in ${absPath}`);
    return false;
  }

  // Parse package.json
  let packageJson: any;
  try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  } catch (error) {
    logger.error(`Error parsing package.json: ${(error as Error).message}`);
    return false;
  }

  // Skip building if there's no build script and no custom command
  if (
    !config.buildCommand &&
    (!packageJson.scripts || !packageJson.scripts.build)
  ) {
    logger.info(`No build script found for ${packageName}, skipping build`);
    return true;
  }

  // Run build command
  // Detect package manager specific to this package
  const packageManager = detectPackageManagerForPath(absPath);
  const packagePmCommands =
    packageManager === mainPmCommands.getPackageManager()
      ? mainPmCommands
      : new PackageManagerCommands(packageManager, logger);

  // Run build command using the package's own package manager
  return packagePmCommands.runBuild(absPath, packageName, config.buildCommand);
}
