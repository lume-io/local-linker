import * as fs from "fs";
import * as path from "path";
import { LocalPackages, PackageConfig, ToolConfig } from "./types";
import { log } from "./logger";

// Configuration filename
export const CONFIG_FILE = ".localpackages";

/**
 * Parse a package line from the config file
 * Format: package-name = path [build-command] [watch:pattern1,pattern2]
 */
function parsePackageLine(line: string): [string, PackageConfig] | null {
  const parts = line.split("=").map((p) => p.trim());
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }

  const packageName = parts[0];
  const packageInfo = parts[1];

  // Check for build command in square brackets
  const buildCommandMatch = packageInfo.match(/^(.*?)\s+\[(.*?)\](?:\s+|$)/);
  let packagePath = packageInfo;
  let buildCommand: string | undefined = undefined;

  if (buildCommandMatch) {
    packagePath = buildCommandMatch[1].trim();
    buildCommand = buildCommandMatch[2].trim() || undefined;
  }

  // Check for watch patterns in watch:[] format
  const watchPatternsMatch = packageInfo.match(/\s+watch:\[(.*?)\](?:\s+|$)/);
  let watchPatterns: string[] | undefined = undefined;

  if (watchPatternsMatch) {
    packagePath = packagePath.replace(watchPatternsMatch[0], "").trim();
    watchPatterns = watchPatternsMatch[1].split(",").map((p) => p.trim());
  }

  return [
    packageName,
    {
      path: packagePath,
      buildCommand,
      watchPatterns,
    },
  ];
}

/**
 * Read the local packages configuration file
 */
export function readConfig(): LocalPackages {
  try {
    const configPath = path.resolve(process.cwd(), CONFIG_FILE);
    if (!fs.existsSync(configPath)) {
      log(
        `No ${CONFIG_FILE} file found. Create one to specify local dependencies.`,
        "yellow"
      );
      log(
        `Format: package-name = /path/to/package [build-command] [watch:[pattern1,pattern2]]`,
        "yellow"
      );
      return {};
    }

    const config = fs
      .readFileSync(configPath, "utf8")
      .split("\n")
      .filter((line) => line.trim() && !line.startsWith("#"))
      .reduce<LocalPackages>((acc, line) => {
        const result = parsePackageLine(line);
        if (result) {
          const [packageName, packageConfig] = result;
          acc[packageName] = packageConfig;
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
    log(`Error reading configuration: ${(error as Error).message}`, "red");
    return {};
  }
}

/**
 * Load tool configuration options from package.json
 */
export function loadToolConfig(): ToolConfig {
  try {
    const packageJsonPath = path.resolve(process.cwd(), "package.json");
    if (!fs.existsSync(packageJsonPath)) {
      return {};
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    return packageJson.localLinker || {};
  } catch (error) {
    log(`Error loading tool configuration: ${(error as Error).message}`, "red");
    return {};
  }
}
