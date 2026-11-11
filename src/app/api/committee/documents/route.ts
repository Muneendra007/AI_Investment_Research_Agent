import { NextRequest, NextResponse } from "next/server";
import { ensureCommitteeService } from "@/backend/committee-bridge";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const baseUrl = await ensureCommitteeService();
    const res = await fetch(`${baseUrl}/documents`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch documents";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const incoming = await request.formData();
    const files = incoming.getAll("file").filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Please attach at least one PDF file in the 'file' field." },
        { status: 400 }
      );
    }

    const baseUrl = await ensureCommitteeService();
    const uploaded = [];
    const errors = [];

    for (const file of files) {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        errors.push(`${file.name}: Only PDF files are supported.`);
        continue;
      }
      if (file.size > 25 * 1024 * 1024) {
        errors.push(`${file.name}: Exceeds 25 MB maximum file size.`);
        continue;
      }

      const outgoing = new FormData();
      outgoing.append("file", file, file.name);

      const res = await fetch(`${baseUrl}/documents/upload`, {
        method: "POST",
        body: outgoing,
        signal: AbortSignal.timeout(60_000),
      });

      const payload = await res.json();
      if (!res.ok) {
        errors.push(`${file.name}: ${payload.detail || payload.error || "Upload failed"}`);
      } else {
        uploaded.push(payload);
      }
    }

    if (uploaded.length === 0 && errors.length > 0) {
      return NextResponse.json({ error: errors.join("; "), errors }, { status: 400 });
    }

    return NextResponse.json({ uploaded, errors }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload PDF document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

