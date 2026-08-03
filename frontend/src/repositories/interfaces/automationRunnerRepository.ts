import type { AutomationRunner, MintedAutomationRunner } from '../../types/domain';

export interface AutomationRunnerRepository {
  findAllByProject(projectId: string): Promise<AutomationRunner[]>;
  mint(projectId: string, name: string, labels: string[]): Promise<MintedAutomationRunner>;
}
