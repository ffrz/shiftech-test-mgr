import { supabase } from '../../../config/supabaseClient';
import { mapApiTokenRow } from '../../../helpers/mappers';
import type { ApiToken, MintedApiToken, TokenScope } from '../../../types/domain';
import type { ApiTokenRepository } from '../../interfaces/apiTokenRepository';

export const apiTokenRepositoryAdapter: ApiTokenRepository = {
  async findAllByProject(projectId: string): Promise<ApiToken[]> {
    const { data, error } = await supabase
      .from('api_tokens')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapApiTokenRow);
  },

  async mint(projectId: string, name: string, scopes: TokenScope[]): Promise<MintedApiToken> {
    const { data, error } = await supabase
      .rpc('mint_api_token', { p_project_id: projectId, p_name: name, p_scopes: scopes })
      .single();
    if (error) throw error;
    const row = data as { token: string; id: string };
    return { id: row.id, token: row.token };
  },

  async revoke(id: string): Promise<void> {
    const { error } = await supabase.rpc('revoke_api_token', { p_token_id: id });
    if (error) throw error;
  },
};
