interface CharacterCountProps {
  value: string;
  maxLength: number;
}

export function CharacterCount({ value, maxLength }: CharacterCountProps) {
  return (
    <small className="text-color-secondary" style={{ alignSelf: 'flex-end' }}>
      {value.length} / {maxLength}
    </small>
  );
}
