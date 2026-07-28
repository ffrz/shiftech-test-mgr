import { InputText } from 'primereact/inputtext';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchInput({ value, onChange, placeholder = 'Search...', className }: SearchInputProps) {
  return (
    <span className={`p-icon-field p-icon-field-left inline-flex${value ? ' p-icon-field-right' : ''}${className ? ` ${className}` : ''}`}>
      <i className="pi pi-search p-input-icon" />
      <InputText
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
