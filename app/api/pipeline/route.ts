import { NextRequest } from "next/server";
import type { FounderProfile, PipelineEvent, FundingOpportunity, ApplicationDraft, ActionItem } from "@/lib/types";
import { runDiscoveryAgent } from "@/lib/agents/discovery";
import { runQualificationAgent } from "@/lib/agents/qualification";
import { runApplicationAgent } from "@/lib/agents/application";
import { runTrackingAgent } from "@/lib/agents/tracking";
import {
  saveFounderProfile,
  saveOpportunities,
  saveApplicationDrafts,
  saveActionQueue,
} from "@/lib/supabase";

export const maxDuration = 300;

function encode(event: PipelineEvent & { sessionId?: string }): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function parseProfile(raw: Record<string, unknown>): FounderProfile {
  return {
    name: raw.name as string,
    email: raw.email as string,
    phone: raw.phone as string | undefined,
    businessName: raw.businessName as string,
    location: raw.location as string,
    industry: raw.industry as string,
    stage: raw.stage as FounderProfile["stage"],
    description: raw.description as string,
    traction: raw.traction as string | undefined,
    teamSize: raw.teamSize as number | undefined,
    fundingAmount: raw.fundingAmount as string,
    useOfFunds: raw.useOfFunds as string,
    legalStructure: raw.legalStructure as string | undefined,
    registrationStatus: raw.registrationStatus as string | undefined,
    demographics: raw.demographics as string | undefined,
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const profile = parseProfile(body);

  // Generate sessionId upfront so it's available even if DB save fails
  const sessionId = crypto.randomUUID();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: PipelineEvent & { sessionId?: string }) =>
        controller.enqueue(new TextEncoder().encode(encode(event)));

      try {
        // ── 1. Discovery ────────────────────────────────────────────────
        send({ stage: "discovery", status: "running", message: "Scanning grants, accelerators & funding programs..." });
        const opportunities = await runDiscoveryAgent(profile);
        send({ stage: "discovery", status: "complete", data: opportunities, message: `Found ${opportunities.length} opportunities` });

        // ── 2. Qualification ────────────────────────────────────────────
        send({ stage: "qualification", status: "running", message: "Scoring eligibility & ranking matches..." });
        const qualified = await runQualificationAgent(profile, opportunities);
        send({ stage: "qualification", status: "complete", data: qualified, message: `${qualified.length} qualified matches` });

        // ── 3. Application Drafting ──────────────────────────────────────
        send({ stage: "application", status: "running", message: "Drafting tailored applications for top matches..." });
        const drafts = await runApplicationAgent(profile, qualified);
        send({ stage: "application", status: "complete", data: drafts, message: `Drafted ${drafts.length} applications` });

        // ── 4. Tracking ──────────────────────────────────────────────────
        send({ stage: "tracking", status: "running", message: "Building your action queue..." });
        const actionQueue = await runTrackingAgent(drafts);
        send({ stage: "tracking", status: "complete", data: actionQueue });

        // ── Persist to DB (non-fatal) ────────────────────────────────────
        try {
          await saveFounderProfile(profile, sessionId);
          await saveOpportunities(sessionId, qualified);
          await saveApplicationDrafts(sessionId, drafts);
          const allActions: ActionItem[] = [
            ...actionQueue.readyToSubmit,
            ...actionQueue.needsFounderInput,
            ...actionQueue.submitted,
          ];
          await saveActionQueue(sessionId, allActions);
        } catch {
          // DB unavailable — results still delivered to client via SSE
        }

        // ── Done ─────────────────────────────────────────────────────────
        send({
          stage: "done",
          status: "complete",
          sessionId,
          data: { opportunities, qualified, drafts, actionQueue },
        });
      } catch (err) {
        send({
          stage: "error",
          status: "error",
          message: err instanceof Error ? err.message : "Pipeline failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
