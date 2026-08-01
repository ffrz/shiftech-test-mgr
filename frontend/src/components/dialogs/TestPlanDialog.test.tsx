// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { TestPlanDialog } from '../../components/dialogs/TestPlanDialog';
import type { TestPlanStatus } from '../../types/domain';

function renderDialog(overrides: Partial<{
  visible: boolean;
  editing: boolean;
  code: string;
  name: string;
  description: string;
  status: TestPlanStatus;
  error: string | null;
}> = {}) {
  return render(
    <TestPlanDialog
      visible={overrides.visible ?? true}
      editing={overrides.editing ?? false}
      code={overrides.code ?? ''}
      onCodeChange={vi.fn()}
      name={overrides.name ?? ''}
      onNameChange={vi.fn()}
      description={overrides.description ?? ''}
      onDescriptionChange={vi.fn()}
      status={overrides.status ?? 'draft'}
      onStatusChange={vi.fn()}
      error={overrides.error ?? null}
      onHide={vi.fn()}
      onSave={vi.fn()}
    />,
  );
}

afterEach(() => {
  cleanup();
});

describe('TestPlanDialog', () => {
  it('renders "New Test Plan" header when not editing', () => {
    renderDialog({ editing: false });
    expect(screen.getByText('New Test Plan')).toBeInTheDocument();
  });

  it('renders "Edit Test Plan" header when editing', () => {
    renderDialog({ editing: true });
    expect(screen.getByText('Edit Test Plan')).toBeInTheDocument();
  });

  it('renders code input', () => {
    renderDialog({ code: 'TP-001' });
    const input = screen.getByDisplayValue('TP-001');
    expect(input).toBeInTheDocument();
  });

  it('renders name input', () => {
    renderDialog({ name: 'Sprint 1' });
    const input = screen.getByDisplayValue('Sprint 1');
    expect(input).toBeInTheDocument();
  });

  it('renders description textarea', () => {
    renderDialog({ description: 'Test description' });
    expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
  });

  it('calls onSave when save button is clicked', () => {
    const onSave = vi.fn();
    render(
      <TestPlanDialog
        visible editing={false} code="" onCodeChange={vi.fn()}
        name="" onNameChange={vi.fn()} description="" onDescriptionChange={vi.fn()}
        status="draft" onStatusChange={vi.fn()} error={null}
        onHide={vi.fn()} onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it('shows error message below name when error is set', () => {
    renderDialog({ error: 'Name is required' });
    expect(screen.getByText('Name is required')).toBeInTheDocument();
  });

  it('shows status dropdown only in edit mode', () => {
    const { rerender } = render(
      <TestPlanDialog
        visible editing={false} code="" onCodeChange={vi.fn()}
        name="" onNameChange={vi.fn()} description="" onDescriptionChange={vi.fn()}
        status="draft" onStatusChange={vi.fn()} error={null}
        onHide={vi.fn()} onSave={vi.fn()}
      />,
    );
    expect(screen.queryByText('Status')).not.toBeInTheDocument();

    rerender(
      <TestPlanDialog
        visible editing code="" onCodeChange={vi.fn()}
        name="" onNameChange={vi.fn()} description="" onDescriptionChange={vi.fn()}
        status="draft" onStatusChange={vi.fn()} error={null}
        onHide={vi.fn()} onSave={vi.fn()}
      />,
    );
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('shows character count for description', () => {
    renderDialog({ description: 'Hello' });
    expect(screen.getByText('5 / 1000')).toBeInTheDocument();
  });
});
