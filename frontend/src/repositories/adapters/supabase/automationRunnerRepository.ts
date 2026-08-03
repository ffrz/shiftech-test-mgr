import { supabase } from '../../../config/supabaseClient';
import { mapAutomationRunnerRow } from '../../../helpers/mappers';
import type { AutomationRunner, MintedAutomationRunner } from '../../../types/domain';
import type { AutomationRunnerRepository } from '../../interfaces/automationRunnerRepository';

export const automationRunnerRepositoryAdapter: AutomationRunnerRepository = {
  async findAllByProject(projectId: string): Promise<AutomationRunner[]> {
    const { data, error } = await supabase
      .from('automation_runners')
      .select('id, project_id, name, labels, token_prefix, active, last_seen_at, created_by, created_at, updated_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapAutomationRunnerRow);
  },

  async mint(projectId: string, name: string, labels: string[]): Promise<MintedAutomationRunner> {
    const { data, error } = await supabase
      .rpc('mint_automation_runner_token', { p_project_id: projectId, p_name: name, p_labels: labels })
      .single();
    if (error) throw error;
    const row = data as { runner: any; token: string };
    return { runner: mapAutomationRunnerRow(row.runner), token: row.token };
  },
};
