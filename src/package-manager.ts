import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { PackageManager } from "./types";
import { Logger } from "./logger";

/**
 * Detect the package manager being used in the project
 */
export function detectPackageManager(): PackageManager {
  if (fs.existsSync(path.resolve(process.cwd(), "pnpm-lock.yaml"))) {
    return "pnpm";
  } else if (fs.existsSync(path.resolve(process.cwd(), "yarn.lock"))) {
    return "yarn";
  }
  return "npm"; // Default to npm
}

/**
 * Helper class to execute package manager commands
 */
export class PackageManagerCommands {
  private packageManager: PackageManager;
  private logger: Logger;

  constructor(packageManager: PackageManager, logger: Logger) {
    this.packageManager = packageManager;
    this.logger = logger;
  }

  /**
   * Create a global link for a package
   */
  createGlobalLink(packagePath: string, packageName: string): boolean {
    this.logger.start(`Creating global link for ${packageName}...`);

    try {
      let command: string;

      if (this.packageManager === "yarn") {
        command = `cd "${packagePath}" && yarn link`;
      } else if (this.packageManager === "pnpm") {
        command = `cd "${packagePath}" && pnpm link --global`;
      } else {
        command = `cd "${packagePath}" && npm link`;
      }

      execSync(command, { stdio: "ignore" });
      this.logger.success(`Created global link for ${packageName}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to create global link: ${(error as Error).message}`
      );
      return false;
    }
  }

  /**
   * Link a globally-linked package to the current project
   */
  linkToProject(packageName: string): boolean {
    this.logger.start(`Linking ${packageName} to current project...`);

    try {
      let command: string;

      if (this.packageManager === "yarn") {
        command = `yarn link "${packageName}"`;
      } else if (this.packageManager === "pnpm") {
        command = `pnpm link --global "${packageName}"`;
      } else {
        command = `npm link "${packageName}"`;
      }

      execSync(command, { stdio: "ignore" });
      this.logger.success(`Linked ${packageName} to current project`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to link to project: ${(error as Error).message}`
      );
      return false;
    }
  }

  /**
   * Run a build command in a package
   */
  runBuild(
    packagePath: string,
    packageName: string,
    customCommand?: string
  ): boolean {
    const defaultCommand = `${this.packageManager} run build`;
    const buildCommand = customCommand || defaultCommand;

    this.logger.start(`Building ${packageName} using '${buildCommand}'...`);

    try {
      execSync(`cd "${packagePath}" && ${buildCommand}`, { stdio: "ignore" });
      this.logger.success(`Built ${packageName}`);
      return true;
    } catch (error) {
      this.logger.error(`Build failed: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Install dependencies in the current project
   */
  installDependencies(): boolean {
    this.logger.start("Installing dependencies...");

    try {
      execSync(`${this.packageManager} install`, { stdio: "ignore" });
      this.logger.success("Dependencies installed");
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to install dependencies: ${(error as Error).message}`
      );
      return false;
    }
  }
}
