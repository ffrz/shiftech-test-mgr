import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { InputTextarea } from 'primereact/inputtextarea';
import { profileRepository } from '../../repositories/profileRepository';
import { testCaseRepository } from '../../repositories/testCaseRepository';
import { issueRepository } from '../../repositories/issueRepository';

interface MentionTextareaProps {
  projectId: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onSubmitShortcut?: () => void;
}

type Trigger = '@' | '#' | '!';

interface Suggestion {
  key: string;
  code: string;
  label: string;
  sublabel?: string;
}

// Detects an in-progress "@handle"/"#code"/"!code" token immediately before the caret, so
// the dropdown only opens while actively typing a mention (not for any trigger char
// elsewhere in the text, e.g. "!" as punctuation or "#" in a hex code).
function findActiveMention(text: string, caret: number): { trigger: Trigger; start: number; query: string } | null {
  const upToCaret = text.slice(0, caret);
  const match = upToCaret.match(/(?:^|\s)([@#!])([a-zA-Z0-9_-]*)$/);
  if (!match) return null;
  const trigger = match[1] as Trigger;
  const query = match[2];
  const start = upToCaret.length - query.length - 1;
  return { trigger, start, query };
}

// Textarea with mention autocomplete for three reference types, all parsed server-side by
// activityService: @username (profile, triggers a notification), #code (test case),
// !code (issue) — the last two link to their detail page when rendered (see renderMentions).
export function MentionTextarea({ projectId, value, onChange, rows = 2, placeholder, className, autoFocus, onSubmitShortcut }: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mention, setMention] = useState<{ trigger: Trigger; start: number; query: string } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Not passed as InputTextarea's `autoFocus` prop: PrimeReact's autoResize combo reads
  // elementRef.current in the native focus handler before its own ref-merging effect has
  // run, so a synchronous native autofocus hits it as the bare ref object rather than the
  // DOM node ("getBoundingClientRect is not a function"). Focusing ourselves next tick
  // avoids that race.
  useEffect(() => {
    if (!autoFocus) return;
    const id = requestAnimationFrame(() => textareaRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [autoFocus]);

  const { data: rawSuggestions = [] } = useQuery({
    queryKey: ['mentions', mention?.trigger ?? '', projectId, mention?.query ?? ''],
    queryFn: async () => {
      if (!mention) return [];
      if (mention.trigger === '@') return profileRepository.search(mention.query, 5);
      if (mention.trigger === '#') return testCaseRepository.searchByProject(projectId, mention.query, 5);
      return issueRepository.searchByProject(projectId, mention.query, 5);
    },
    enabled: !!mention,
  });

  const suggestions: Suggestion[] = !mention
    ? []
    : mention.trigger === '@'
      ? (rawSuggestions as { id: string; username: string; displayName?: string | null }[]).map((p) => ({
          key: p.id,
          code: p.username,
          label: `@${p.username}`,
          sublabel: p.displayName ?? undefined,
        }))
      : (rawSuggestions as { id: string; code: string; title: string }[]).map((item) => ({
          key: item.id,
          code: item.code,
          label: `${mention.trigger}${item.code}`,
          sublabel: item.title,
        }));

  function handleChange(newValue: string) {
    onChange(newValue);
    const caret = textareaRef.current?.selectionStart ?? newValue.length;
    const active = findActiveMention(newValue, caret);
    setMention(active);
    setActiveIndex(0);
  }

  function applyMention(suggestion: Suggestion) {
    if (!mention || !textareaRef.current) return;
    const caret = textareaRef.current.selectionStart;
    const before = value.slice(0, mention.start);
    const after = value.slice(caret);
    const inserted = `${mention.trigger}${suggestion.code} `;
    onChange(`${before}${inserted}${after}`);
    setMention(null);

    const newCaret = before.length + inserted.length;
    requestAnimationFrame(() => {
      textareaRef.current?.setSelectionRange(newCaret, newCaret);
      textareaRef.current?.focus();
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onSubmitShortcut?.();
      return;
    }
    if (!mention || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      applyMention(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setMention(null);
    }
  }

  return (
    <div className="relative">
      <InputTextarea
        ref={textareaRef}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setMention(null), 150)}
        rows={rows}
        autoResize
        placeholder={placeholder}
        className={className}
      />
      {mention && suggestions.length > 0 && (
        <ul
          className="absolute z-5 mt-1 p-0 border-round shadow-2"
          style={{ listStyle: 'none', minWidth: '14rem', border: '1px solid var(--surface-border)', background: 'var(--surface-card)' }}
        >
          {suggestions.map((s, i) => (
            <li
              key={s.key}
              className={`flex align-items-center gap-2 p-2 cursor-pointer ${i === activeIndex ? 'surface-hover' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyMention(s)}
            >
              <span className="font-medium text-sm">{s.label}</span>
              {s.sublabel && <span className="text-color-secondary text-xs white-space-nowrap overflow-hidden text-overflow-ellipsis">{s.sublabel}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
