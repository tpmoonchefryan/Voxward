import { resolve } from "node:path";

/**
 * Run directories whose batch is still running in this process. The orphan sweep leaves them alone, so a periodic sweep
 * never stops a CLI that this server started on purpose.
 */
const activeDirectories = new Set<string>();

export function markRunDirectoryActive(directory: string): void {
  activeDirectories.add(resolve(directory));
}

export function releaseRunDirectory(directory: string): void {
  activeDirectories.delete(resolve(directory));
}

export function isRunDirectoryActive(directory: string): boolean {
  return activeDirectories.has(resolve(directory));
}
