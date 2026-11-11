import { NextRequest, NextResponse } from "next/server";
import { ensureCommitteeService } from "@/backend/committee-bridge";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const cleanId = id?.trim();
    if (!cleanId || !/^[a-zA-Z0-9_-]+$/.test(cleanId)) {
      return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
    }

    const baseUrl = await ensureCommitteeService();
    const res = await fetch(`${baseUrl}/documents/${encodeURIComponent(cleanId)}`, {
      method: "DELETE",
      signal: AbortSignal.timeout(10_000),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

