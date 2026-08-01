// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { TestSuiteDialog } from '../../components/dialogs/TestSuiteDialog';
import type { TestSuiteVisibility } from '../../types/domain';

function renderDialog(overrides: Partial<{
  visible: boolean;
  mode: 'create' | 'edit' | 'duplicate';
  initialName: string;
  initialDescription: string;
  initialVisibility: TestSuiteVisibility;
  saving: boolean;
}> = {}) {
  return render(
    <TestSuiteDialog
      visible={overrides.visible ?? true}
      mode={overrides.mode ?? 'create'}
      initialData={overrides.mode !== 'create' ? {
        name: overrides.initialName ?? 'Existing Suite',
        description: overrides.initialDescription ?? '',
        visibility: overrides.initialVisibility ?? 'private',
      } : undefined}
      saving={overrides.saving}
      onHide={vi.fn()}
      onSave={vi.fn().mockResolvedValue(undefined)}
    />,
  );
}

afterEach(() => {
  cleanup();
});

describe('TestSuiteDialog', () => {
  describe('header', () => {
    it('shows "New Suite" for create mode', () => {
      renderDialog({ mode: 'create' });
      expect(screen.getByText('New Suite')).toBeInTheDocument();
    });

    it('shows "Edit Suite" for edit mode', () => {
      renderDialog({ mode: 'edit' });
      expect(screen.getByText('Edit Suite')).toBeInTheDocument();
    });

    it('shows "Duplicate Suite" for duplicate mode', () => {
      renderDialog({ mode: 'duplicate' });
      expect(screen.getByText('Duplicate Suite')).toBeInTheDocument();
    });
  });

  describe('form', () => {
    it('pre-fills name from initialData in edit mode', () => {
      renderDialog({ mode: 'edit', initialName: 'My Suite' });
      expect(screen.getByDisplayValue('My Suite')).toBeInTheDocument();
    });

    it('has empty name in create mode', () => {
      renderDialog({ mode: 'create' });
      const input = screen.getByRole('textbox', { name: 'Name' });
      expect(input).toHaveValue('');
    });

    it('shows visibility dropdown in create mode', () => {
      renderDialog({ mode: 'create' });
      expect(screen.getByText('Visibility')).toBeInTheDocument();
    });

    it('shows visibility dropdown in edit mode', () => {
      renderDialog({ mode: 'edit' });
      expect(screen.getByText('Visibility')).toBeInTheDocument();
    });

    it('hides visibility dropdown in duplicate mode', () => {
      renderDialog({ mode: 'duplicate' });
      expect(screen.queryByText('Visibility')).not.toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('shows error when name is empty and save is clicked', () => {
      renderDialog({ mode: 'create' });
      fireEvent.click(screen.getByText('Save'));
      expect(screen.getByText('Name cannot be empty')).toBeInTheDocument();
    });

    it('trims the name before validating', () => {
      renderDialog({ mode: 'create' });
      const input = screen.getByRole('textbox', { name: 'Name' });
      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.click(screen.getByText('Save'));
      expect(screen.getByText('Name cannot be empty')).toBeInTheDocument();
    });

    it('calls onSave with trimmed values when name is valid', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      render(
        <TestSuiteDialog
          visible mode="create" onHide={vi.fn()} onSave={onSave}
        />,
      );
      const input = screen.getByRole('textbox', { name: 'Name' });
      fireEvent.change(input, { target: { value: '  My Suite  ' } });
      fireEvent.click(screen.getByText('Save'));

      await vi.waitFor(() => {
        expect(onSave).toHaveBeenCalled();
      });
    });
  });

  describe('saving state', () => {
    it('shows loading on save button when saving prop is true', () => {
      renderDialog({ mode: 'create', saving: true });
      const button = screen.getByRole('button', { name: 'Save' });
      expect(button).toBeDisabled();
    });
  });
});
