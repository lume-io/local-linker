/**
 * Package manager types supported by the tool
 */
export type PackageManager = "npm" | "yarn" | "pnpm";

/**
 * Configuration for a local package
 */
export interface PackageConfig {
  path: string; // Path to the package
  buildCommand?: string; // Optional custom build command
  watchPatterns?: string[]; // Optional custom watch patterns
}

/**
 * Map of package names to their configurations
 */
export interface LocalPackages {
  [packageName: string]: PackageConfig;
}

/**
 * Information about a package including dependencies
 */
export interface PackageInfo {
  name: string;
  path: string;
  dependencies: string[];
  devDependencies: string[];
  peerDependencies: string[];
}

/**
 * Configuration for the tool
 */
export interface ToolConfig {
  useSpinner?: boolean;
  resolveDependencies?: boolean;
}
