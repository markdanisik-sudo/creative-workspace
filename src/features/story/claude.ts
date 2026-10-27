import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { toStorySummary, type StorySummary } from "./types";

const MODEL = "claude-opus-5-5";

/** The shape Claude answers in (structured outputs). */
const SUMMARY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["transcript", "title", "logline", "synopsis", "tone", "scenes", "needs", "questions"],
  properties: {
    transcript: {
      type: "string",
      description:
        "Word-for-word transcription of the handwritten or printed notes in the attachment, keeping the author's line breaks. Empty when there is no attachment.",
    },
    title: { type: "string", description: "A short working title." },
    logline: { type: "string", description: "The idea in one or two sentences." },
    synopsis: { type: "string", description: "What happens, in a short paragraph or two." },
    tone: { type: "string", description: "Mood, look and feel, references." },
    scenes: {
      type: "array",
      description: "The scenes or shots the idea implies, in order.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "description"],
        properties: { title: { type: "string" }, description: { type: "string" } },
      },
    },
    needs: {
      type: "object",
      additionalProperties: false,
      required: ["locations", "cast", "gear", "props"],
      properties: {
        locations: { type: "array", items: { type: "string" } },
        cast: { type: "array", items: { type: "string" } },
        gear: { type: "array", items: { type: "string" } },
        props: { type: "array", items: { type: "string" } },
      },
    },
    questions: {
      type: "array",
      description: "Open questions worth answering before the shoot.",
      items: { type: "string" },
    },
  },
} as const;

const SYSTEM = `You help filmmakers and photographers shape the idea for a personal project.
You get their notes: text they typed, and/or a photo or PDF of handwritten or printed notes.
Read everything carefully, including messy handwriting, arrows and margin notes. Transcribe attachments faithfully; never invent content the notes don't contain.
Then summarise the idea as the author means it: a working title, a logline, a short synopsis, the tone, the scenes or shots it implies, and what the shoot will need (locations, cast, gear, props). Stay close to the author's intent; where something is unclear or missing, put it in "questions" instead of guessing.
Answer in the language the notes are written in; if they mix languages, use the main one.`;

export type Attachment =
  | {
      kind: "image";
      mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
      data: string;
    }
  | { kind: "pdf"; data: string };

export class StoryAiUnavailable extends Error {}

export interface StoryReading {
  transcript: string;
  summary: StorySummary | null;
}

/** Reads the notes (and attachment) and returns a transcript and a summary. */
export async function readStory(input: {
  text: string;
  attachment: Attachment | null;
  locale: "cs" | "en";
}): Promise<StoryReading> {
  if (!process.env.ANTHROPIC_API_KEY) throw new StoryAiUnavailable("ANTHROPIC_API_KEY is not set");
  const client = new Anthropic();

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (input.attachment?.kind === "image") {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: input.attachment.mediaType,
        data: input.attachment.data,
      },
    });
  } else if (input.attachment?.kind === "pdf") {
    content.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: input.attachment.data },
    });
  }
  content.push({
    type: "text",
    text: [
      input.attachment ? "The attachment holds my notes." : "",
      input.text.trim()
        ? `What I've written so far:\n<notes>\n${input.text.trim()}\n</notes>`
        : "I haven't typed anything yet.",
      `If the notes give no clear language, answer in ${input.locale === "cs" ? "Czech" : "English"}.`,
    ]
      .filter(Boolean)
      .join("\n\n"),
  });

  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: { type: "json_schema", schema: SUMMARY_SCHEMA } },
    system: SYSTEM,
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") throw new Error("The model declined the request");
  const block = response.content.find(
    (item): item is Anthropic.Beta.BetaTextBlock => item.type === "text",
  );
  if (!block) throw new Error(`No text in the response (stop: ${response.stop_reason})`);
  const parsed = JSON.parse(block.text) as Record<string, unknown>;
  return {
    transcript: typeof parsed.transcript === "string" ? parsed.transcript.slice(0, 100_000) : "",
    summary: toStorySummary(parsed),
  };
}
