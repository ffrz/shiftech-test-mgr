import type { TestPlan, TestPlanStatus } from '../../types/domain';

export interface TestPlanFindAllOptions {
  search?: string;
  statuses?: TestPlanStatus[];
}

export interface TestPlanCreateInput {
  projectId: string;
  name: string;
  description: string | null;
  code?: string | null;
  createdBy?: string | null;
}

export interface TestPlanRepository {
  findAllByProject(projectId: string, options?: TestPlanFindAllOptions): Promise<TestPlan[]>;
  findById(id: string): Promise<TestPlan | null>;
  create(input: TestPlanCreateInput): Promise<TestPlan>;
  update(id: string, changes: Partial<Pick<TestPlan, 'name' | 'description' | 'status' | 'code'>>): Promise<TestPlan>;
  remove(id: string): Promise<void>;
}
