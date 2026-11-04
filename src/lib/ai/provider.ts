import type { Content } from "@google/genai";
export interface AgentModel {
  engine: string;
  generate(
    contents: Content[],
    system: string,
    signal: AbortSignal,
  ): Promise<Content>;
}
