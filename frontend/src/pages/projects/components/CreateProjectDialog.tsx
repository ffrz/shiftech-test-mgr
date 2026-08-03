import { useState, useRef, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { CharacterCount } from '../../../components/ui/CharacterCount';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { FloatLabel } from 'primereact/floatlabel';
import { projectService } from '../../../services/projectService';
import { testSuiteService } from '../../../services/testSuiteService';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../hooks/queryKeys';
import { useAuthContext } from '../../../hooks/useAuth';
import type { Project, ProjectVisibility } from '../../../types/domain';

interface CreateProjectDialogProps {
  visible: boolean;
  onHide: () => void;
  onSaved: () => void;
  editingProject?: Project | null;
  onCreated?: (id: string) => void;
}

export function CreateProjectDialog({ visible, onHide, onSaved, editingProject, onCreated }: CreateProjectDialogProps) {
  const { user } = useAuthContext();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<ProjectVisibility>('private');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const { data: templates = [] } = useQuery({
    queryKey: [...queryKeys.testSuites(), 'mine', user?.id],
    queryFn: () => testSuiteService.listByOwner(user!.id),
    enabled: visible && !editingProject && !!user,
  });

  useEffect(() => {
    if (!visible) return;
    if (editingProject) {
      setName(editingProject.name);
      setDescription(editingProject.description ?? '');
      setVisibility(editingProject.visibility);
    } else {
      setName('');
      setDescription('');
      setVisibility('private');
    }
    setTemplateId(null);
    setError(null);
  }, [visible, editingProject]);

  useEffect(() => {
    if (error && nameRef.current) {
      nameRef.current.focus();
      nameRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  async function handleSave() {
    if (saving.current) return;
    saving.current = true;
    setError(null);
    try {
      if (editingProject) {
        await projectService.update(editingProject.id, { name, description, visibility }, user?.id);
      } else {
        const created = await projectService.create({ name, description, visibility }, user?.id);
        if (templateId) {
          const items = await testSuiteService.listItems(templateId);
          await testSuiteService.cloneItemsToProject(created.id, items.map((i) => i.id));
        }
        onCreated?.(created.id);
      }
      onHide();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project');
    } finally {
      saving.current = false;
    }
  }

  return (
    <Dialog
      header={editingProject ? 'Edit Project' : 'New Project'}
      visible={visible}
      onHide={onHide}
      onShow={() => nameRef.current?.focus()}
      style={{ width: '30rem' }}
    >
      <div className="flex flex-column gap-2">
        <div className="flex flex-column gap-1">
          <FloatLabel className="ifta-field">
            <InputText
              id="create-project-name"
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={error ? 'p-invalid w-full' : 'w-full'}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            />
            <label htmlFor="create-project-name" className={error ? 'p-error' : ''}>Name</label>
          </FloatLabel>
          {error && <small className="p-error">{error}</small>}
        </div>
        <div className="flex flex-column gap-1">
          <FloatLabel className="ifta-field">
            <InputTextarea id="create-project-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={1} autoResize maxLength={1000} className="w-full" />
            <label htmlFor="create-project-description">Description</label>
          </FloatLabel>
          <CharacterCount value={description} maxLength={1000} />
        </div>
        {!editingProject && (
          <div className="flex flex-column">
            <FloatLabel className="ifta-field">
              <Dropdown
                id="create-project-template"
                value={templateId}
                options={templates.map((t) => ({ label: t.name, value: t.id }))}
                onChange={(e) => setTemplateId(e.value)}
                showClear
                className="w-full"
              />
              <label htmlFor="create-project-template">Start from Template (optional)</label>
            </FloatLabel>
          </div>
        )}
        <Button label="Save" size="small" onClick={handleSave} />
      </div>
    </Dialog>
  );
}
