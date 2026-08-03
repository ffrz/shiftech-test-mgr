import { automationRunnerRepository } from '../repositories/automationRunnerRepository';
import type { AutomationRunner, AutomationRunnerStatus, MintedAutomationRunner } from '../types/domain';

// Mirrors the Go MCP backend's AutomationRunner.Status rule (backend/core/domain.go):
// online when active and last_seen_at is within 90 seconds. Computed client-side here
// since there is no server process running that computation for this SPA-direct path.
const ONLINE_WINDOW_MS = 90_000;

export function runnerStatus(runner: AutomationRunner): AutomationRunnerStatus {
  if (!runner.active || !runner.lastSeenAt) return 'offline';
  const lastSeenMs = new Date(runner.lastSeenAt).getTime();
  return Date.now() - lastSeenMs <= ONLINE_WINDOW_MS ? 'online' : 'offline';
}

export const automationRunnerService = {
  listByProject(projectId: string): Promise<AutomationRunner[]> {
    return automationRunnerRepository.findAllByProject(projectId);
  },

  mint(projectId: string, name: string, labels: string[]): Promise<MintedAutomationRunner> {
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error('Name is required');
    return automationRunnerRepository.mint(projectId, trimmedName, labels);
  },
};
