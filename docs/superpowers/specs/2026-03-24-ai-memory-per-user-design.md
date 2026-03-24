# AI Memory Per User — Design Spec

**Date:** 2026-03-24
**Status:** Approved

## Overview

Extend the existing `AIService` with two persistence layers:

1. **Persistent conversation history** — SQLite-backed per-user chat history that survives bot restarts (replacing the current volatile in-memory Map).
2. **Automatic fact extraction** — After each exchange, the AI extracts user facts (name, interests, preferences, etc.) from the conversation and stores them persistently. Facts are injected into the system prompt to give Yuna contextual memory of each user.

## Architecture

### New Database Models

**`UserChatHistory`** (`src/database/models/UserChatHistory.model.ts`)

| Column      | Type    | Constraints              |
|-------------|---------|--------------------------|
| `id`        | INTEGER | PK, auto-increment       |
| `userId`    | STRING  | NOT NULL, indexed        |
| `role`      | STRING  | `'user'` or `'assistant'`|
| `content`   | TEXT    | NOT NULL                 |
| `timestamp` | DATE    | NOT NULL, default NOW    |

- Max 50 rows per user. When cap is reached, the oldest row is deleted in the same DB operation as the in-memory trim.
- Auto-loaded by `SQLize` (follows the existing model auto-discovery pattern).

**`UserFacts`** (`src/database/models/UserFacts.model.ts`)

| Column      | Type    | Constraints               |
|-------------|---------|---------------------------|
| `userId`    | STRING  | PK (composite with `key`) |
| `key`       | STRING  | PK (composite with `userId`) |
| `value`     | TEXT    | NOT NULL                  |
| `updatedAt` | DATE    | NOT NULL, auto-updated    |

- Composite primary key `(userId, key)` enables upsert semantics.
- Keys are free-form strings (e.g., `"name"`, `"age"`, `"interests"`, `"job"`).
- Conflicting facts (user corrects themselves) are resolved by overwriting the existing key.

### Updated `AIService` (`src/api/ai/AIService.ts`)

The in-memory `Map<string, ChatMessage[]>` becomes a **write-through cache**: data is always persisted to DB immediately, and loaded from DB on first access per user (lazy load).

**Added responsibilities:**
- `loadUserData(userId)` — on first access, load history rows + facts rows from DB into memory caches.
- `buildSystemPrompt(userId)` — base system prompt + optional `## Thông tin về người này` facts block (only appended when user has ≥1 fact).
- `parseEnvelope(raw)` — parse JSON envelope `{reply, facts}` from AI response; returns `{reply: string, facts: Fact[]}`. Falls back to `{reply: raw, facts: []}` on parse failure.
- `upsertFacts(userId, facts)` — upsert each fact to `UserFacts` DB and update in-memory facts cache.
- `appendHistory(userId, role, content)` — append to DB + in-memory history, then prune oldest if over 50-message cap.

### System Prompt Modification

When facts exist for a user, the system prompt is extended:

```
[existing SYSTEM_PROMPT]

## Thông tin về người này
- name: Minh
- interests: anime, lập trình
- job: sinh viên
```

No section is added for users with no stored facts.

### AI Response Format

The model is instructed (via system prompt addition) to always respond with a JSON envelope:

```json
{
  "reply": "the actual chat reply here",
  "facts": [
    {"key": "name", "value": "Minh"},
    {"key": "interests", "value": "anime"}
  ]
}
```

`facts` is an empty array `[]` when no new facts are detected. Only facts that are new or changed relative to what's already known should be returned — the AI should not re-emit already-known facts every message.

## Data Flow

```
User mentions bot
  → AIResponsePingEvent.run()
  → aiService.chat(userInput, userId)
      → lazy-load history + facts from DB (if not cached)
      → buildSystemPrompt(userId)        ← includes facts block
      → append user message to history
      → call Qwen API with [systemPrompt, ...history]
      → parseEnvelope(rawResponse)
          → on failure: reply = rawResponse, facts = []
      → upsertFacts(userId, facts)       ← DB + memory
      → appendHistory(userId, 'assistant', reply)  ← DB + memory, prune if >50
      → return reply
  → message.reply(reply)
```

No changes to `AIResponsePingEvent` — all logic is encapsulated in `AIService`.

## Error Handling

| Scenario | Behavior |
|---|---|
| JSON parse failure | Log warning, use raw text as reply, skip fact upsert |
| Empty `facts` array | Valid — no upsert, no error |
| DB load failure | Log error, fall back to empty history/facts; bot stays alive |
| Conflicting fact | Upsert overwrites old value by key |
| History at 50-cap | Delete oldest DB row + shift in-memory array atomically |

## Files Changed

| File | Change |
|------|--------|
| `src/database/models/UserChatHistory.model.ts` | New |
| `src/database/models/UserFacts.model.ts` | New |
| `src/api/ai/AIService.ts` | Updated — DB persistence, fact extraction, JSON envelope |

No changes to `AIResponsePingEvent.ts`, `SQLize.ts` (auto-discovers models), or `Config.ts`.
