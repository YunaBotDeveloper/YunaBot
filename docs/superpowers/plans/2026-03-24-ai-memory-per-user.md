# AI Memory Per User — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist per-user AI conversation history and automatically extracted user facts to SQLite, so Yuna remembers users across bot restarts and accumulates knowledge about them over time.

**Architecture:** Two new Sequelize models (`UserChatHistory`, `UserFacts`) are auto-discovered by the existing `SQLize.loadModels()` system. `AIService` is updated to use a write-through cache (DB-backed) for history, extract facts from each AI response via a JSON envelope, and inject stored facts into the system prompt. `AIResponsePingEvent` gains a try/catch.

**Tech Stack:** TypeScript, discord.js, Sequelize + SQLite (`sequelize`, `sqlite3`), Bun (dev), Node.js (prod). Lint via `gts` (`npm run fix`). No unit test framework — verification is TypeScript compilation + manual bot test.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/database/models/UserChatHistory.model.ts` | Create | SQLite model for per-user message history |
| `src/database/models/UserFacts.model.ts` | Create | SQLite model for per-user extracted facts |
| `src/api/ai/AIService.ts` | Modify | DB-backed history, fact extraction, JSON envelope, prompt injection |
| `src/events/impl/AIResponsePingEvent.ts` | Modify | Add try/catch around `chat()` call |

---

## Task 1: Create `UserChatHistory` model

**Files:**
- Create: `src/database/models/UserChatHistory.model.ts`

- [ ] **Step 1: Create the model file**

Follow the existing model pattern (see `GuildLog.model.ts`): module-level `let sequelize` variable, `init*Model` function.

```typescript
import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  Sequelize,
  DataTypes,
} from 'sequelize';

let sequelize: Sequelize | null = null;

class UserChatHistory extends Model<
  InferAttributes<UserChatHistory>,
  InferCreationAttributes<UserChatHistory>
> {
  declare id: CreationOptional<number>;
  declare userId: string;
  declare role: 'user' | 'assistant';
  declare content: string;
  declare readonly createdAt: CreationOptional<Date>;
}

export function initUserChatHistoryModel(sequelizeInstance: Sequelize): void {
  sequelize = sequelizeInstance;
  UserChatHistory.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      sequelize: sequelizeInstance,
      tableName: 'UserChatHistory',
      timestamps: true,
      updatedAt: false,
      indexes: [{fields: ['userId']}],
    },
  );
}

export default UserChatHistory;
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npm run compile
```

Expected: `build/` produced with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/database/models/UserChatHistory.model.ts
git commit -m "feat: add UserChatHistory Sequelize model"
```

---

## Task 2: Create `UserFacts` model

**Files:**
- Create: `src/database/models/UserFacts.model.ts`

- [ ] **Step 1: Create the model file**

Composite primary key `(userId, key)` with `timestamps: false` enables SQLite `INSERT OR REPLACE` upsert semantics via `Model.upsert()`.

```typescript
import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
  DataTypes,
} from 'sequelize';

let sequelize: Sequelize | null = null;

class UserFacts extends Model<
  InferAttributes<UserFacts>,
  InferCreationAttributes<UserFacts>
> {
  declare userId: string;
  declare key: string;
  declare value: string;
}

export function initUserFactsModel(sequelizeInstance: Sequelize): void {
  sequelize = sequelizeInstance;
  UserFacts.init(
    {
      userId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      key: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      value: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      sequelize: sequelizeInstance,
      tableName: 'UserFacts',
      timestamps: false,
    },
  );
}

export default UserFacts;
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npm run compile
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/database/models/UserFacts.model.ts
git commit -m "feat: add UserFacts Sequelize model"
```

---

## Task 3: Replace in-memory history with DB-backed write-through cache

This task adds the new fields, `ensureLoaded`, `appendHistory`, and `clearHistory` to `AIService`. The old `getHistory` method and `chat()` are **not modified yet** — they are replaced together in Task 4 to avoid an intermediate broken compile state.

**Files:**
- Modify: `src/api/ai/AIService.ts`

- [ ] **Step 1: Add imports**

At the top of `AIService.ts`, add:

```typescript
import UserChatHistory from '../../database/models/UserChatHistory.model';
import UserFacts from '../../database/models/UserFacts.model';
```

- [ ] **Step 2: Add new private fields to the class**

Inside the `AIService` class, after the existing `private userMemory` line, add:

```typescript
// Write-through cache: userId -> facts map (key -> value)
private userFacts: Map<string, Map<string, string>> = new Map();
// Per-user initialization lock: prevents double DB load on concurrent messages
private loadingLocks: Map<string, Promise<void>> = new Map();
```

- [ ] **Step 3: Add `ensureLoaded` private method**

Add before the existing `getHistory` method:

```typescript
/**
 * Ensure history and facts for a user are loaded from DB into memory.
 * Uses a per-user lock to prevent concurrent duplicate loads.
 */
private async ensureLoaded(userId: string): Promise<void> {
  // Already loaded
  if (this.userMemory.has(userId)) return;

  // Another call is already loading this user — wait for it
  if (this.loadingLocks.has(userId)) {
    await this.loadingLocks.get(userId);
    return;
  }

  const loadPromise = (async () => {
    try {
      const rows = await UserChatHistory.findAll({
        where: {userId},
        order: [['id', 'ASC']],
      });
      this.userMemory.set(
        userId,
        rows.map(r => ({role: r.role as 'user' | 'assistant', content: r.content})),
      );

      const factRows = await UserFacts.findAll({where: {userId}});
      const factsMap = new Map<string, string>();
      for (const f of factRows) {
        factsMap.set(f.key, f.value);
      }
      this.userFacts.set(userId, factsMap);
    } catch (error) {
      this.logger.error(`Failed to load user data from DB for ${userId}: ${error}`);
      // Fall back to empty — bot stays alive
      this.userMemory.set(userId, []);
      this.userFacts.set(userId, new Map());
    } finally {
      this.loadingLocks.delete(userId);
    }
  })();

  this.loadingLocks.set(userId, loadPromise);
  await loadPromise;
}
```

- [ ] **Step 4: Add `appendHistory` private method**

Add after `ensureLoaded`:

```typescript
/**
 * Append a message to both the in-memory cache and the DB.
 * Prunes to ≤50 rows per user in both DB and memory after insert.
 */
private async appendHistory(
  userId: string,
  role: 'user' | 'assistant',
  content: string,
): Promise<void> {
  const history = this.userMemory.get(userId)!;
  history.push({role, content});

  try {
    await UserChatHistory.create({userId, role, content});

    // Loop-delete oldest rows until count is within cap
    let count = await UserChatHistory.count({where: {userId}});
    while (count > 50) {
      const oldest = await UserChatHistory.findOne({
        where: {userId},
        order: [['id', 'ASC']],
      });
      if (oldest) await oldest.destroy();
      count--;
    }
  } catch (error) {
    this.logger.error(`Failed to persist message to DB for ${userId}: ${error}`);
  }

  // Mirror cap on in-memory array
  while (history.length > 50) {
    history.shift();
  }
}
```

- [ ] **Step 5: Replace the existing `clearHistory` method**

Replace the current `clearHistory` implementation (which only deletes from memory):

```typescript
public async clearHistory(userId: string): Promise<void> {
  this.userMemory.delete(userId);
  this.userFacts.delete(userId);
  try {
    await UserChatHistory.destroy({where: {userId}});
    await UserFacts.destroy({where: {userId}});
  } catch (error) {
    this.logger.error(`Failed to clear DB memory for ${userId}: ${error}`);
  }
  this.logger.info(`Cleared AI memory for user: ${userId}`);
}
```

- [ ] **Step 6: Verify TypeScript compiles cleanly**

`getHistory` and `chat()` still exist unchanged — no compile errors expected.

```bash
npm run compile
```

Expected: no errors.

- [ ] **Step 7: Fix lint**

```bash
npm run fix
```

- [ ] **Step 8: Commit**

```bash
git add src/api/ai/AIService.ts
git commit -m "feat: add DB-backed write-through cache and clearHistory to AIService"
```

---

## Task 4: Add fact extraction, JSON envelope, prompt injection, and rewrite `chat()`

This task adds the remaining helper methods and replaces `getHistory` + `chat()` in one atomic change, so the compile is always clean.

**Files:**
- Modify: `src/api/ai/AIService.ts`

- [ ] **Step 1: Add `Fact`, `EnvelopeResponse` interfaces and `FORMAT_INSTRUCTION` constant**

Add after the existing `ChatCompletionResponse` interface at the top of the file:

```typescript
interface Fact {
  key: string;
  value: string;
}

interface EnvelopeResponse {
  reply: string;
  facts: Fact[];
}

const FORMAT_INSTRUCTION = `

## Định dạng trả lời
Luôn trả lời bằng JSON hợp lệ theo định dạng sau, không thêm bất kỳ nội dung nào ngoài JSON:
{"reply": "<câu trả lời chat>", "facts": [{"key": "<tên thuộc tính>", "value": "<giá trị>"}]}
- "reply": câu trả lời tự nhiên như bình thường
- "facts": danh sách thông tin mới về người này mà mày vừa học được từ tin nhắn này (để trống [] nếu không có gì mới)
- Chỉ đưa vào "facts" những thông tin MỚI hoặc THAY ĐỔI, không lặp lại những gì đã biết`;
```

- [ ] **Step 2: Add `buildSystemPrompt` private method**

Add to the class (after `ensureLoaded`):

```typescript
/**
 * Build the full system prompt: base persona + optional facts block + JSON format instruction.
 */
private buildSystemPrompt(userId: string): string {
  const factsMap = this.userFacts.get(userId);
  let prompt = SYSTEM_PROMPT;

  if (factsMap && factsMap.size > 0) {
    const lines = Array.from(factsMap.entries())
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n');
    prompt += `\n\n## Thông tin về người này\n${lines}`;
  }

  prompt += FORMAT_INSTRUCTION;
  return prompt;
}
```

- [ ] **Step 3: Add `parseEnvelope` private method**

```typescript
/**
 * Parse the JSON envelope {reply, facts} from raw AI output.
 * Strips Markdown code fences (including leading whitespace) before parsing.
 * Falls back to {reply: raw, facts: []} on any parse failure.
 */
private parseEnvelope(raw: string): EnvelopeResponse {
  const stripped = raw
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  try {
    const parsed = JSON.parse(stripped) as EnvelopeResponse;
    if (typeof parsed.reply !== 'string') throw new Error('missing reply field');
    return {
      reply: parsed.reply,
      facts: Array.isArray(parsed.facts) ? parsed.facts : [],
    };
  } catch {
    this.logger.warning(
      `Failed to parse AI envelope — using raw response. Preview: ${raw.slice(0, 200)}`,
    );
    return {reply: raw, facts: []};
  }
}
```

- [ ] **Step 4: Add `upsertFacts` private method**

```typescript
/**
 * Upsert new/changed facts into DB and in-memory cache.
 * Enforces a 20-fact cap per user: deletes one arbitrary existing fact when at cap.
 */
private async upsertFacts(userId: string, facts: Fact[]): Promise<void> {
  if (facts.length === 0) return;

  const factsMap = this.userFacts.get(userId) ?? new Map<string, string>();

  for (const {key, value} of facts) {
    if (!key || !value) continue;

    const isNew = !factsMap.has(key);

    // Enforce 20-fact cap before inserting a genuinely new key
    if (isNew && factsMap.size >= 20) {
      const arbitraryKey = factsMap.keys().next().value;
      if (arbitraryKey !== undefined) {
        factsMap.delete(arbitraryKey);
        try {
          await UserFacts.destroy({where: {userId, key: arbitraryKey}});
        } catch (error) {
          this.logger.error(`Failed to delete overflow fact for ${userId}: ${error}`);
        }
      }
    }

    factsMap.set(key, value);

    try {
      await UserFacts.upsert({userId, key, value});
    } catch (error) {
      this.logger.error(`Failed to upsert fact for ${userId} [${key}]: ${error}`);
    }
  }

  this.userFacts.set(userId, factsMap);
}
```

- [ ] **Step 5: Delete `getHistory` and rewrite `chat()` atomically**

**Delete** the entire old `getHistory` method:

```typescript
// DELETE:
private getHistory(userId: string): ChatMessage[] {
  if (!this.userMemory.has(userId)) {
    this.userMemory.set(userId, []);
  }
  return this.userMemory.get(userId)!;
}
```

**Replace** the entire `chat()` method with:

```typescript
public async chat(userMessage: string, userId: string): Promise<string> {
  await this.ensureLoaded(userId);

  const systemPrompt = this.buildSystemPrompt(userId);
  await this.appendHistory(userId, 'user', userMessage);

  const history = this.userMemory.get(userId)!;
  const messages: ChatMessage[] = [
    {role: 'system', content: systemPrompt},
    ...history,
  ];

  let rawReply: string;
  try {
    const response = await axios.post<ChatCompletionResponse>(
      `${this.baseUrl}/chat/completions`,
      {model: this.model, messages},
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      },
    );

    rawReply = response.data?.choices?.[0]?.message?.content ?? '';
    if (!rawReply) {
      this.logger.error('AI response was empty or malformed.');
      return 'hmm i kinda blanked out for a sec, can you say that again? 😅';
    }
  } catch (error) {
    this.logger.error(`AI API request failed: ${error}`);
    return 'ah sorry, my brain just lagged for a moment 💀 try again?';
  }

  const {reply, facts} = this.parseEnvelope(rawReply);
  await this.upsertFacts(userId, facts);
  await this.appendHistory(userId, 'assistant', reply);

  return reply;
}
```

Also remove the old history trim loop that was inside `chat()` (the `while (history.length > MAX_HISTORY_PER_USER)` blocks) — `appendHistory` handles this now. Remove `MAX_HISTORY_PER_USER` constant if it is now unused.

- [ ] **Step 6: Verify TypeScript compiles cleanly**

```bash
npm run compile
```

Expected: no errors.

- [ ] **Step 7: Fix lint**

```bash
npm run fix
```

- [ ] **Step 8: Commit**

```bash
git add src/api/ai/AIService.ts
git commit -m "feat: add fact extraction, JSON envelope, and system prompt injection to AIService"
```

---

## Task 5: Add try/catch to `AIResponsePingEvent`

**Files:**
- Modify: `src/events/impl/AIResponsePingEvent.ts`

- [ ] **Step 1: Add logger field**

Inside the `AIResponsePingEvent` class, add:

```typescript
private readonly logger = Log4TS.getLogger();
```

Add the import at the top if not already present:

```typescript
import Log4TS from '../../logger/Log4TS';
```

- [ ] **Step 2: Wrap `chat()` call in try/catch**

Replace:

```typescript
const reply = await this.aiService.chat(userInput, message.author.id);

await message.reply({
  content: reply,
  allowedMentions: {users: [message.author.id]},
});
```

With:

```typescript
let reply: string;
try {
  reply = await this.aiService.chat(userInput, message.author.id);
} catch (error) {
  this.logger.error(`Unhandled error in AIService.chat: ${error}`);
  await message.reply({
    content: 'uh oh, something broke on my end 💀 try again later',
    allowedMentions: {users: [message.author.id]},
  });
  return;
}

await message.reply({
  content: reply,
  allowedMentions: {users: [message.author.id]},
});
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
npm run compile
```

Expected: no errors.

- [ ] **Step 4: Fix lint**

```bash
npm run fix
```

- [ ] **Step 5: Commit**

```bash
git add src/events/impl/AIResponsePingEvent.ts
git commit -m "fix: add try/catch around AIService.chat in AIResponsePingEvent"
```

---

## Task 6: Manual end-to-end verification

- [ ] **Step 1: Start the bot in dev mode**

```bash
bun run dev
```

Expected: logs show `Loaded model: UserChatHistory`, `Loaded model: UserFacts`, `Synchronized database`.

- [ ] **Step 2: Test basic conversation memory**

In Discord, mention the bot and have a short conversation. Stop the bot (`Ctrl+C`). Restart with `bun run dev`. Mention again — conversation should continue from where it left off.

- [ ] **Step 3: Test fact extraction**

Tell the bot your name: `@Yuna tui tên là Minh`. In the next message, ask something unrelated. Check that the bot addresses you naturally.

- [ ] **Step 4: Inspect raw AI output to verify JSON envelope**

Temporarily add `this.logger.debug(rawReply)` before `parseEnvelope` in `AIService.chat()`. Run the bot, send a message, check logs for the JSON envelope. Remove the debug log after confirming. Commit the removal.

- [ ] **Step 5: Test restart persistence via SQLite**

After a conversation, restart the bot. Check the SQLite DB directly (replace `data.db` with the actual path configured in `ExtendedClient`):

```bash
sqlite3 data.db "SELECT userId, role, substr(content,1,60) FROM UserChatHistory LIMIT 10;"
sqlite3 data.db "SELECT * FROM UserFacts LIMIT 10;"
```

Expected: rows persist across restart.

- [ ] **Step 6: Test `clearHistory` removes facts from DB**

If a `/clearmemory` command or equivalent is available, invoke it for your user ID, then check:

```bash
sqlite3 data.db "SELECT * FROM UserFacts WHERE userId = 'YOUR_USER_ID';"
sqlite3 data.db "SELECT * FROM UserChatHistory WHERE userId = 'YOUR_USER_ID';"
```

Expected: zero rows for both tables.

- [ ] **Step 7: Final lint pass**

```bash
npm run fix
npm run compile
```

Expected: no errors, no lint warnings.
