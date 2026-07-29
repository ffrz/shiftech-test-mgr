-- github_links stores freeform {url, label} pairs — nothing GitHub-specific
-- (no PR/issue number, no repo, no status sync). Rename to reflect what it
-- actually is: a generic external link list.
alter table issues rename column github_links to external_links;
