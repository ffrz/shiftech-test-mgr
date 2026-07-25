import { useState, useEffect, useRef } from 'react';
import { AutoComplete, type AutoCompleteCompleteEvent } from 'primereact/autocomplete';
import { profileService } from '../../services/profileService';
import type { Profile } from '../../types/domain';

interface UsernamePickerProps {
  value: Profile | null;
  onChange: (profile: Profile | null) => void;
  placeholder?: string;
  excludeIds?: string[];
}

// Reusable invite-by-username typeahead — searches profiles.username/display_name via
// profileService.search as the user types, instead of loading every user up front.
// Used by the project member invite flow; reusable anywhere else a user needs to be
// looked up by public identity (see docs/ROADMAP_V2.md V2-P6-T03).
export function UsernamePicker({ value, onChange, placeholder, excludeIds }: UsernamePickerProps) {
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      value={value ?? undefined}
      suggestions={suggestions}
      completeMethod={search}
      field="username"
      itemTemplate={(profile: Profile) => (
        <div className="flex flex-column">
          <span>{profile.displayName ?? profile.username}</span>
          <span className="text-sm text-color-secondary">@{profile.username}</span>
        </div>
      )}
      onChange={(e) => onChange(typeof e.value === 'string' ? null : e.value)}
      placeholder={placeholder ?? 'Search by username...'}
      className="w-full"
      inputClassName="w-full"
      dropdown={false}
    />
  );
}
