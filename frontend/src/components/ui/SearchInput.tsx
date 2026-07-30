import { InputText } from 'primereact/inputtext';
import { FloatLabel } from 'primereact/floatlabel';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Opt-in floating label (ifta-field) for standalone filter dialogs — table
   * toolbars/inline filters must stay compact and should NOT pass this. */
  floating?: boolean;
  label?: string;
  id?: string;
}

export default function SearchInput({ value, onChange, placeholder = 'Search...', className, floating, label = 'Search', id }: SearchInputProps) {
  if (floating) {
    // No search/clear icon here — this variant sits in a filter dialog next to
    // plain ifta-field Dropdowns with no icon of their own, so keeping the icon
    // would misalign this field's label/text against the others below it.
    return (
      <FloatLabel className={`ifta-field w-full${className ? ` ${className}` : ''}`}>
        <InputText id={id} className="w-full" value={value} onChange={(e) => onChange(e.target.value)} />
        <label htmlFor={id}>{label}</label>
      </FloatLabel>
    );
  }

  const iconFieldClassName = `p-icon-field p-icon-field-left inline-flex${value ? ' p-icon-field-right' : ''}${className ? ` ${className}` : ''}`;

  return (
    <span className={iconFieldClassName}>
      <i className="pi pi-search p-input-icon" />
      <InputText
        id={id}
        className="w-full"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <i
          className="pi pi-times p-input-icon"
          style={{ right: '0.75rem', cursor: 'pointer', color: 'var(--text-color-secondary)' }}
          onClick={() => onChange('')}
        />
      )}
    </span>
  );
}
