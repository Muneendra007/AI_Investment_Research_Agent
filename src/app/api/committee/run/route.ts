import { NextRequest, NextResponse } from "next/server";
import { ensureCommitteeService } from "@/backend/committee-bridge";

export const dynamic = "force-dynamic";

interface CommitteeRequestBody {
  companyName?: string;
  query?: string;
  docIds?: string[];
  riskVetoThreshold?: number;
}

export async function POST(request: NextRequest) {
  let body: CommitteeRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const companyName = body.companyName?.trim();
  if (!companyName) {
    return NextResponse.json(
      { error: "companyName is required" },
      { status: 400 }
    );
  }
  if (companyName.length > 120) {
    return NextResponse.json(
      { error: "companyName exceeds 120 characters" },
      { status: 400 }
    );
  }

  const threshold =
    typeof body.riskVetoThreshold === "number"
      ? Math.max(0, Math.min(100, Math.round(body.riskVetoThreshold)))
      : 70;

  try {
    const baseUrl = await ensureCommitteeService();
    const upstream = await fetch(`${baseUrl}/committee/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_name: companyName,
        query: (body.query || "").trim().slice(0, 500),
        doc_ids: Array.isArray(body.docIds) ? body.docIds : [],
        risk_veto_threshold: threshold,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => "Upstream committee error");
      return NextResponse.json(
        { error: text || "Committee workflow failed" },
        { status: upstream.status || 500 }
      );
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to run investment committee";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

