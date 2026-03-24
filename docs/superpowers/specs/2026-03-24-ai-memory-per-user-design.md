# AI Memory Per User — Design Spec

**Date:** 2026-03-24
**Status:** Approved

## Overview

Extend the existing `AIService` with two persistence layers:

1. **Persistent conversation history** — SQLite-backed per-user chat history that survives bot restarts (replacing the current volatile in-memory Map).
2. **Automatic fact extraction** — After each exchange, the AI extracts user facts (name, interests, preferences, etc.) from the conversation and stores them persistently. Facts are injected into the system prompt to give Yuna contextual memory of each user.

## Architecture

### New Database Models

Both models follow the existing auto-discovery pattern: each file exports an `init*Model(sequelizeInstance: Sequelize): void` function and a default model class. `SQLize` calls these automatically.

---

**`UserChatHistory`** (`src/database/models/UserChatHistory.model.ts`)

| Column      | Type    | Constraints               |
|-------------|---------|---------------------------|
| `id`        | INTEGER | PK, auto-increment        |
| `userId`    | STRING  | NOT NULL, indexed         |
| `role`      | STRING  | `'user'` or `'assistant'` |
| `content`   | TEXT    | NOT NULL                  |
| `createdAt` | DATE    | Managed by Sequelize (`timestamps: true`) |

- Max **50 rows per user**. The cap is enforced per `appendHistory` call: after inserting, if `COUNT(userId) > 50`, delete the oldest row(s) by `id ASC` until count ≤ 50.
- Since user and assistant messages are each one row, 50 rows = 25 exchanges max stored.

---

**`UserFacts`** (`src/database/models/UserFacts.model.ts`)

| Column   | Type   | Constraints                              |
|----------|--------|------------------------------------------|
| `userId` | STRING | PK (composite with `key`), NOT NULL      |
| `key`    | STRING | PK (composite with `userId`), NOT NULL   |
| `value`  | TEXT   | NOT NULL                                 |

- Use `timestamps: false`. Sequelize's SQLite `upsert` uses `INSERT OR REPLACE` — this requires both `userId` and `key` declared as `primaryKey: true` in the model, and works correctly with `timestamps: false`. Do **not** declare `updatedAt` as a manual column.
- Keys are free-form strings (e.g., `"name"`, `"age"`, `"interests"`, `"job"`).
- Cap: **20 facts per user**. When inserting a new fact that would exceed 20 for a user, delete one arbitrary existing fact for that user first (no ordering column exists — use `LIMIT 1` on any row). In practice, upserts on existing keys don't increase count.
- Conflicting facts: upsert overwrites existing value by key.

---

### Updated `AIService` (`src/api/ai/AIService.ts`)

`AIService.getInstance()` signature is **unchanged** — it still takes `(apiKey, baseUrl, model)`. No Sequelize reference is needed in `AIService` because `UserChatHistory` and `UserFacts` are Sequelize model classes with static methods (`findAll`, `create`, `destroy`, `upsert`) that operate without a Sequelize instance reference once `init*Model(sequelizeInstance)` has been called. By the time `AIResponsePingEvent` is constructed (after `SQLize.loadModels()` and `getSync()` complete), the models are fully initialized.

The in-memory `Map<string, ChatMessage[]>` becomes a **write-through cache**: data is always persisted to DB immediately, and loaded from DB on first access per user (lazy load).

**Concurrency:** A per-user initialization lock `Map<string, Promise<void>>` prevents race conditions when two messages arrive before the first lazy-load resolves.

**Added methods:**

| Method | Description |
|--------|-------------|
| `loadUserData(userId)` | Lazy-load history rows + facts from DB into memory caches. Guarded by per-user lock. |
| `buildSystemPrompt(userId)` | Returns base system prompt + optional facts block + JSON format instruction |
| `parseEnvelope(raw)` | Parse JSON envelope; strips Markdown code fences (` ```json ... ``` `) before `JSON.parse`; falls back to `{reply: raw, facts: []}` on failure |
| `upsertFacts(userId, facts)` | Upsert each fact to `UserFacts` DB and update in-memory facts cache |
| `appendHistory(userId, role, content)` | Insert row to `UserChatHistory` DB + push to in-memory history; prune oldest if `count > 50` |
| `clearHistory(userId)` | Delete all `UserChatHistory` rows for userId from DB **and** clear in-memory cache (updated from current in-memory-only behavior) |

---

### System Prompt Structure

The final system message sent to the Qwen API is composed as follows (in order):

```
[base SYSTEM_PROMPT]

## Thông tin về người này
- name: Minh
- interests: anime, lập trình
(only present if user has ≥1 fact stored)

## Định dạng trả lời
Luôn trả lời bằng JSON hợp lệ theo định dạng sau, không thêm bất kỳ nội dung nào ngoài JSON:
{"reply": "<câu trả lời chat>", "facts": [{"key": "<tên thuộc tính>", "value": "<giá trị>"}]}
- "reply": câu trả lời tự nhiên như bình thường
- "facts": danh sách thông tin mới về người này mà mày vừa học được từ tin nhắn này (để trống [] nếu không có gì mới)
- Chỉ đưa vào "facts" những thông tin MỚI hoặc THAY ĐỔI, không lặp lại những gì đã biết
```

`parseEnvelope` must:
1. Strip surrounding Markdown code fences (` ```json\n...\n``` ` or ` ```\n...\n``` `) before parsing
2. Attempt `JSON.parse`
3. On any failure: log a warning, return `{reply: rawText, facts: []}`

---

## Data Flow

```
User mentions bot
  → AIResponsePingEvent.run()          ← wrapped in try/catch; replies with error fallback on throw
  → aiService.chat(userInput, userId)
      → ensureLoaded(userId)           ← lazy-load from DB; per-user lock prevents double-load
      → buildSystemPrompt(userId)      ← base prompt + facts block + JSON format instruction
      → appendHistory(userId, 'user', userInput)   ← DB insert + memory push + prune
      → call Qwen API with [systemPrompt, ...history]
      → parseEnvelope(rawResponse)     ← strip fences, JSON.parse, fallback on error
      → upsertFacts(userId, facts)     ← DB upsert + memory update (skipped if facts=[])
      → appendHistory(userId, 'assistant', reply)  ← DB insert + memory push + prune
      → return reply
  → message.reply(reply)
```

---

## Error Handling

| Scenario | Behavior |
|---|---|
| JSON parse failure | Log warning, use raw text as reply, skip fact upsert |
| Empty `facts` array | Valid — no upsert, no error |
| DB load failure on `ensureLoaded` | Log error, fall back to empty history/facts; bot stays alive |
| Conflicting fact (user corrects themselves) | Upsert overwrites old value by key |
| History at 50-row cap | Delete oldest DB row + shift in-memory array |
| Facts at 20-key cap | Delete oldest key from DB before inserting new one |
| Concurrent messages from same user | Per-user lock ensures `ensureLoaded` runs once; subsequent calls use cached data |
| `aiService.chat()` throws | `AIResponsePingEvent` wraps in try/catch, replies with generic error message |

---

## Files Changed

| File | Change |
|------|--------|
| `src/database/models/UserChatHistory.model.ts` | New |
| `src/database/models/UserFacts.model.ts` | New |
| `src/api/ai/AIService.ts` | Updated — DB persistence, fact extraction, JSON envelope, clearHistory fix |
| `src/events/impl/AIResponsePingEvent.ts` | Minor — add try/catch around `chat()` call |
