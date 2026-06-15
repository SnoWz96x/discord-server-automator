# Next Polish Roadmap

This roadmap captures the next improvements that would make the bot and server feel more production-ready.

## Delivered In The Current Iteration

- Moderation case IDs for warn, mute, timeout, kick and ban.
- `/case`, `/cases`, `/reason` and `/modhistory`.
- Ticket modal intake with summary, timing, evidence and priority.
- Ticket claim, close, reopen, staff notes and Markdown/HTML transcript.
- `/ticket` operations for status, priority, notes and category transfer.
- `/profile` with XP, level, coins, CP, badges, creatures, rank and voice time.
- `/quests` with daily/weekly progress and claimable rewards.
- Categorized shop with stock and limited-time item support.
- Forum templates for bugs, suggestions and reports with staff status buttons.
- Dashboard AutoMod configuration endpoint and UI.
- Dashboard Discord OAuth2/local auth guard, signed sessions and guild permission checks.
- Dashboard module settings persistence and editable module cards.
- GitHub Actions CI, Docker, Compose and environment validation scripts.

## High Impact

- Wire persisted dashboard module settings into every runtime bot module.
- Add dashboard audit browser with before/after payloads.
- Add scheduled digest posts for open tickets, active bugs and top suggestions.
- Add dashboard drill-down pages for cases, tickets and quest completion.

## Community Experience

- Add seasonal badges and event roles.
- Add `/daily-streak`.
- Add welcome variations per language.
- Add language-specific announcement mirrors when needed.
- Add creature evolution and profile cosmetics.

## Moderation

- Add configurable punishment ladder.
- Add dashboard log filters by event type with search and export.
- Add AutoMod review queue for deleted/blocked content.
- Add case appeal workflow.

## Open Source Quality

- Add unit tests for ticket modal and transcript generation.
- Add architecture diagrams.
- Add issue templates for bug reports and feature requests.
