import * as fs from "fs";
import * as path from "path";
import { LocalPackages, PackageInfo } from "./types";
import { Logger } from "./logger";

/**
 * Build dependency information for a package
 */
function getPackageInfo(
  packageName: string,
  packagePath: string,
  logger: Logger
): PackageInfo | null {
  const absPath = path.isAbsolute(packagePath)
    ? packagePath
    : path.resolve(process.cwd(), packagePath);

  const packageJsonPath = path.join(absPath, "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    logger.error(`No package.json found in ${absPath}`);
    return null;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

    return {
      name: packageName,
      path: absPath,
      dependencies: Object.keys(packageJson.dependencies || {}),
      devDependencies: Object.keys(packageJson.devDependencies || {}),
      peerDependencies: Object.keys(packageJson.peerDependencies || {}),
    };
  } catch (error) {
    logger.error(
      `Error parsing package.json for ${packageName}: ${
        (error as Error).message
      }`
    );
    return null;
  }
}

/**
 * Build a dependency graph for all local packages
 */
export function buildDependencyGraph(
  localPackages: LocalPackages,
  logger: Logger
): Map<string, PackageInfo> {
  const graph = new Map<string, PackageInfo>();

  logger.info("Building dependency graph...");

  // Build the graph
  for (const [name, config] of Object.entries(localPackages)) {
    const info = getPackageInfo(name, config.path, logger);
    if (info) {
      graph.set(name, info);
    }
  }

  return graph;
}

/**
 * Get the topological order of packages to build
 */
export function getTopologicalOrder(
  graph: Map<string, PackageInfo>,
  logger: Logger
): string[] {
  const visited = new Set<string>();
  const temp = new Set<string>();
  const order: string[] = [];

  // Helper function for DFS traversal
  function visit(name: string) {
    if (temp.has(name)) {
      logger.warn(`Circular dependency detected: ${name}`);
      return;
    }

    if (visited.has(name)) return;

    temp.add(name);

    const node = graph.get(name);
    if (node) {
      // Check all dependency types
      const allDeps = [
        ...node.dependencies,
        ...node.devDependencies,
        ...node.peerDependencies,
      ];

      // Only consider dependencies that are in our local packages
      const localDeps = allDeps.filter((dep) => graph.has(dep));

      for (const dep of localDeps) {
        visit(dep);
      }
    }

    temp.delete(name);
    visited.add(name);
    order.push(name);
  }

  // Visit all nodes
  for (const name of graph.keys()) {
    if (!visited.has(name)) {
      visit(name);
    }
  }

  // Reverse to get correct build order
  return order.reverse();
}
