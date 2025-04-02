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
 * Detect the package manager for a specific directory path
 */
export function detectPackageManagerForPath(
  packagePath: string
): PackageManager {
  if (fs.existsSync(path.resolve(packagePath, "pnpm-lock.yaml"))) {
    return "pnpm";
  } else if (fs.existsSync(path.resolve(packagePath, "yarn.lock"))) {
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
   * Get the package manager type
   */
  getPackageManager(): PackageManager {
    return this.packageManager;
  }

  /**
   * Create a global link for a package
   */
  createGlobalLink(packagePath: string, packageName: string): boolean {
    this.logger.start(`Creating global link for ${packageName}...`);

    try {
      let command: string;

      // Get the full path to the package manager binary
      const pmPath = this.getPackageManagerPath();

      if (this.packageManager === "yarn") {
        command = `cd "${packagePath}" && ${pmPath} link`;
      } else if (this.packageManager === "pnpm") {
        command = `cd "${packagePath}" && ${pmPath} link --global`;
      } else {
        command = `cd "${packagePath}" && ${pmPath} link`;
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

  // Helper method to get the full path to the package manager (in case project uses volta, nvm, etc)
  private getPackageManagerPath(): string {
    try {
      // Use 'which' on Unix-like systems or 'where' on Windows
      const whichCmd = process.platform === "win32" ? "where" : "which";
      return execSync(`${whichCmd} ${this.packageManager}`).toString().trim();
    } catch (error) {
      // If the command fails, fall back to just using the name
      this.logger.warn(
        `Could not find path for ${this.packageManager}, using default`
      );
      return this.packageManager;
    }
  }

  /**
   * Link a globally-linked package to the current project
   */
  linkToProject(packageName: string): boolean {
    this.logger.start(`Linking ${packageName} to current project...`);

    try {
      let command: string;

      // Get the full path to the package manager binary
      const pmPath = this.getPackageManagerPath();

      if (this.packageManager === "yarn") {
        command = `${pmPath} link "${packageName}"`;
      } else if (this.packageManager === "pnpm") {
        command = `${pmPath} link --global "${packageName}"`;
      } else {
        command = `${pmPath} link "${packageName}"`;
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
    // Get the full path to the package manager binary
    const pmPath = this.getPackageManagerPath();
    const defaultCommand = `${pmPath} run build`;
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
