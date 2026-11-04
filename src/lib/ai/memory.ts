import { AgentError } from "./errors";
import type { AgentContext } from "./tool-runner";
export type Turn = { role: "user" | "assistant"; content: string };
export type Session = {
  id: string;
  owner: string;
  context: AgentContext;
  messages: Turn[];
  updatedAt: number;
  lastTurn?: { context: AgentContext; messages: Turn[]; question: string };
};
export class ConversationMemory {
  private sessions = new Map<string, Session>();
  private busy = new Set<string>();
  constructor(
    private ttl = 3600000,
    private capacity = 200,
  ) {}
  get(owner: string, id: string) {
    const now = Date.now();
    for (const [key, s] of this.sessions)
      if (now - s.updatedAt > this.ttl && !this.busy.has(key))
        this.sessions.delete(key);
    const session = this.sessions.get(owner + ":" + id);
    return session ? structuredClone(session) : undefined;
  }
  async run<T>(
    owner: string,
    id: string,
    operation: (session: Session) => Promise<{ session: Session; value: T }>,
  ): Promise<T> {
    const key = owner + ":" + id;
    if (this.busy.has(key)) throw new AgentError("SESSION_BUSY", 409);
    const existing = this.get(owner, id);
    if (!existing && this.sessions.size >= this.capacity)
      throw new AgentError("SESSION_BUSY", 503);
    this.busy.add(key);
    try {
      const result = await operation(
        existing ?? {
          id,
          owner,
          context: { filters: {}, referencedIds: [] },
          messages: [],
          updatedAt: Date.now(),
        },
      );
      result.session.messages = boundHistory(result.session.messages);
      result.session.updatedAt = Date.now();
      this.sessions.set(key, structuredClone(result.session));
      return result.value;
    } finally {
      this.busy.delete(key);
    }
  }
  clear(owner: string, id?: string) {
    for (const [key, s] of this.sessions)
      if (s.owner === owner && (!id || s.id === id) && !this.busy.has(key))
        this.sessions.delete(key);
  }
}
export function boundHistory(messages: Turn[]) {
  let remaining = 12000;
  const selected: Turn[] = [];
  for (const m of messages.slice(-12).reverse()) {
    const content = m.content.slice(
      0,
      Math.min(m.role === "user" ? 6000 : 2000, remaining),
    );
    if (!content) break;
    selected.unshift({ role: m.role, content });
    remaining -= content.length;
  }
  return selected;
}
