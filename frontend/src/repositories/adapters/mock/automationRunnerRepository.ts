import type { AutomationRunner, MintedAutomationRunner } from '../../../types/domain';
import type { AutomationRunnerRepository } from '../../interfaces/automationRunnerRepository';

let seq = 0;
function nextId(): string {
  seq += 1;
  return `mock-runner-${seq}`;
}

export function createMockAutomationRunnerRepository(seed: AutomationRunner[] = []): AutomationRunnerRepository {
  const store = new Map<string, AutomationRunner>(seed.map((r) => [r.id, r]));

  return {
    async findAllByProject(projectId: string): Promise<AutomationRunner[]> {
      return [...store.values()]
        .filter((r) => r.projectId === projectId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async mint(projectId: string, name: string, labels: string[]): Promise<MintedAutomationRunner> {
      const id = nextId();
      const now = new Date().toISOString();
      const runner: AutomationRunner = {
        id,
        projectId,
        name,
        labels,
        tokenPrefix: 'tm_mock',
        active: true,
        lastSeenAt: null,
        createdBy: 'mock-user',
        createdAt: now,
        updatedAt: now,
      };
      store.set(id, runner);
      return { runner, token: `tm_mock_${id}` };
    },
  };
}
