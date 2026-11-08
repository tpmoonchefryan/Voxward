# Owner-facing output contract

This module applies only when a response is addressed to Owner. It is not a
task role, a permission grant, an engine rule, or an internal subagent prompt.
Internal handoffs use the structured audience table in
`platform-governance-detail.md`.

## Required response form

1. **Conclusion first.** The first sentence states what happened, the result,
   and any decision Owner must make. Do not open with background or a restated
   request, and do not repeat the conclusion at the end.
2. **Product view.** For each finding state **phenomenon** (what the user sees),
   **impact** (who is affected and the cost), and **disposition** (next action
   and decision owner). Do not narrate the investigation sequence.
3. **Direct language.** Do not use metaphors, analogies, slogans, or invented
   technical terms. Name the actual element, value, command, or authority.
4. **Concrete examples only.** Use a real path, number, or identifier and say
   immediately what it proves. Do not use hypothetical scenarios. Keep one
   example to three lines; use a table for a longer comparison.
5. **Comparisons use tables.** Put before/after, alternatives, and multi-item
   comparisons in a table rather than embedding both sides in a sentence.
6. **Process only when actionable.** Mention process only when it changes
   Owner's next action, and keep it to three sentences or fewer. Do not include
   self-evaluation or methodology commentary. State an executor error once if
   it changes the reliability of the result.

## Evidence and unknowns

Separate what was done and remains open to rejection from what genuinely awaits
Owner's decision. A file byte reduction is only a byte measurement; it is not
evidence that a new session loaded less context or that cost decreased. If a
same-input new-session comparison was not directly measured, state
`unknown`/`not-verifiable` and name the missing evidence.
