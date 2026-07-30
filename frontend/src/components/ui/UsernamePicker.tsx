import { useState, useEffect, useRef } from 'react';
import { AutoComplete, type AutoCompleteCompleteEvent } from 'primereact/autocomplete';
import { profileService } from '../../services/profileService';
import type { Profile } from '../../types/domain';

interface UsernamePickerProps {
  value: Profile | null;
  onChange: (profile: Profile | null) => void;
  placeholder?: string;
  excludeIds?: string[];
  id?: string;
}

// Reusable invite-by-username typeahead — searches profiles.username/display_name via
// profileService.search as the user types, instead of loading every user up front.
// Used by the project member invite flow; reusable anywhere else a user needs to be
// looked up by public identity (see docs/ROADMAP_V2.md V2-P6-T03).
export function UsernamePicker({ value, onChange, placeholder, excludeIds, id }: UsernamePickerProps) {
  // AutoComplete's `value` prop doubles as the raw text input value while the user is
  // typing (a string) and the selected item once one is picked (a Profile). Controlling
  // it directly from the parent's `value: Profile | null` breaks mid-keystroke: every
  // onChange fires with the partial string, which the old code discarded (mapping it to
  // null), snapping the input back to empty after each character. Track input text as
  // its own state instead, and only call the parent's onChange once a real Profile is
  // selected (or cleared).
  const [inputValue, setInputValue] = useState<string | Profile>(value ?? '');
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setInputValue(value ?? '');
  }, [value]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  function search(e: AutoCompleteCompleteEvent) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await profileService.search(e.query);
      setSuggestions(excludeIds ? results.filter((p) => !excludeIds.includes(p.id)) : results);
    }, 250);
  }

  return (
    <AutoComplete
      inputId={id}
      value={inputValue}
      suggestions={suggestions}
      completeMethod={search}
      field="username"
      itemTemplate={(profile: Profile) => (
        <div className="flex flex-column">
          <span>{profile.displayName ?? profile.username}</span>
          <span className="text-sm text-color-secondary">@{profile.username}</span>
        </div>
      )}
      onChange={(e) => {
        setInputValue(e.value);
        if (typeof e.value !== 'string') onChange(e.value);
        else if (e.value === '') onChange(null);
      }}
      placeholder={placeholder}
      className="w-full"
      inputClassName="w-full"
      dropdown={false}
    />
  );
}
