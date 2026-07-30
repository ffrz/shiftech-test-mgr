import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

const MENTION_PATTERN = /@([a-zA-Z0-9_]+)/g;
const TEST_CASE_REF_PATTERN = /#([a-zA-Z0-9_-]+)/g;
const ISSUE_REF_PATTERN = /!([a-zA-Z0-9_-]+)/g;

// Every reference token in a comment body, tagged by kind — used both to resolve which
// codes/usernames actually exist (see ActivityPanel) and to render links for the ones that do.
const REF_PATTERNS: { kind: 'mention' | 'testCase' | 'issue'; prefix: string; pattern: RegExp }[] = [
  { kind: 'mention', prefix: '@', pattern: MENTION_PATTERN },
  { kind: 'testCase', prefix: '#', pattern: TEST_CASE_REF_PATTERN },
  { kind: 'issue', prefix: '!', pattern: ISSUE_REF_PATTERN },
];

export function extractMentionUsernames(body: string): string[] {
  const handles = new Set<string>();
  for (const match of body.matchAll(MENTION_PATTERN)) handles.add(match[1]);
  return [...handles];
}

export function extractTestCaseCodes(body: string): string[] {
  const codes = new Set<string>();
  for (const match of body.matchAll(TEST_CASE_REF_PATTERN)) codes.add(match[1]);
  return [...codes];
}

export function extractIssueCodes(body: string): string[] {
  const codes = new Set<string>();
  for (const match of body.matchAll(ISSUE_REF_PATTERN)) codes.add(match[1]);
  return [...codes];
}

interface KnownRefs {
  usernames: Set<string>;
  testCaseCodes: Map<string, string>;
  issueCodes: Map<string, string>;
}

// Splits a comment body on @username / #testcase / !issue tokens and links each to its
// detail page (public profile, test case, issue) — mirrors activityService's
// MENTION_PATTERN so an @-mention link always matches what triggered the notification on
// save. `known` marks which tokens actually resolve to a real record (case-insensitive for
// usernames, exact for codes); unresolved tokens render as plain text, not a dead link.
export function renderMentions(body: string, known: KnownRefs): ReactNode[] {
  const matches: { kind: 'mention' | 'testCase' | 'issue'; index: number; full: string; code: string }[] = [];
  for (const { kind, pattern } of REF_PATTERNS) {
    for (const match of body.matchAll(pattern)) {
      matches.push({ kind, index: match.index ?? 0, full: match[0], code: match[1] });
    }
  }
  matches.sort((a, b) => a.index - b.index);

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const m of matches) {
    if (m.index < lastIndex) continue;
    if (m.index > lastIndex) parts.push(body.slice(lastIndex, m.index));

    if (m.kind === 'mention' && known.usernames.has(m.code.toLowerCase())) {
      parts.push(<Link key={key++} to={`/@${m.code}`} className="entity-link">@{m.code}</Link>);
    } else if (m.kind === 'testCase' && known.testCaseCodes.has(m.code)) {
      parts.push(
        <Link key={key++} to={`/test-cases/${known.testCaseCodes.get(m.code)}`} className="entity-link">
          #{m.code}
        </Link>,
      );
    } else if (m.kind === 'issue' && known.issueCodes.has(m.code)) {
      parts.push(
        <Link key={key++} to={`/issues/${known.issueCodes.get(m.code)}`} className="entity-link">
          !{m.code}
        </Link>,
      );
    } else {
      parts.push(m.full);
    }
    lastIndex = m.index + m.full.length;
  }

  if (lastIndex < body.length) parts.push(body.slice(lastIndex));
  return parts;
}

// Same resolution as renderMentions, but rewrites tokens into Markdown link syntax instead
// of React nodes — used to pre-process a comment body before handing it to ReactMarkdown
// (MarkdownPreview), so mentions still link out even though the body is now rendered as
// Markdown rather than plain text with manual splitting.
export function linkifyMentionsMarkdown(body: string, known: KnownRefs): string {
  const matches: { kind: 'mention' | 'testCase' | 'issue'; index: number; full: string; code: string }[] = [];
  for (const { kind, pattern } of REF_PATTERNS) {
    for (const match of body.matchAll(pattern)) {
      matches.push({ kind, index: match.index ?? 0, full: match[0], code: match[1] });
    }
  }
  matches.sort((a, b) => a.index - b.index);

  let result = '';
  let lastIndex = 0;

  for (const m of matches) {
    if (m.index < lastIndex) continue;
    if (m.index > lastIndex) result += body.slice(lastIndex, m.index);

    if (m.kind === 'mention' && known.usernames.has(m.code.toLowerCase())) {
      result += `[@${m.code}](/@${m.code})`;
    } else if (m.kind === 'testCase' && known.testCaseCodes.has(m.code)) {
      result += `[#${m.code}](/test-cases/${known.testCaseCodes.get(m.code)})`;
    } else if (m.kind === 'issue' && known.issueCodes.has(m.code)) {
      result += `[!${m.code}](/issues/${known.issueCodes.get(m.code)})`;
    } else {
      result += m.full;
    }
    lastIndex = m.index + m.full.length;
  }

  if (lastIndex < body.length) result += body.slice(lastIndex);
  return result;
}
