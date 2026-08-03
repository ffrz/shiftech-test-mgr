import { automationRunnerRepositoryAdapter } from './adapters/automationRunnerResolver';
import type { AutomationRunner, MintedAutomationRunner } from '../types/domain';

export const automationRunnerRepository = {
  findAllByProject(projectId: string): Promise<AutomationRunner[]> {
    return automationRunnerRepositoryAdapter.findAllByProject(projectId);
  },

  mint(projectId: string, name: string, labels: string[]): Promise<MintedAutomationRunner> {
    return automationRunnerRepositoryAdapter.mint(projectId, name, labels);
  },
};
