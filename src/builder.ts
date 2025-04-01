import * as fs from "fs";
import * as path from "path";
import { PackageConfig } from "./types";
import { Logger } from "./logger";
import { PackageManagerCommands } from "./package-manager";

/**
 * Build a package using its build script or a custom command
 */
export function buildPackage(
  packageName: string,
  config: PackageConfig,
  pmCommands: PackageManagerCommands,
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
  return pmCommands.runBuild(absPath, packageName, config.buildCommand);
}
