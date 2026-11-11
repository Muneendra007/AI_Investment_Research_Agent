"""Minimal valid multi-page PDF generator for testing PDF extraction and page citations."""

from __future__ import annotations

from collections.abc import Sequence


def _escape_pdf_text(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def build_multipage_pdf(pages: Sequence[str]) -> bytes:
    """Create valid PDF bytes with each string placed on its own 1-indexed page."""
    if not pages:
        pages = [""]

    objects: list[bytes] = []
    # 1: Catalog, 2: Pages, 3: Font
    page_obj_nums = [4 + i * 2 for i in range(len(pages))]
    kids_ref = " ".join(f"{n} 0 R" for n in page_obj_nums)

    objects.append(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
    objects.append(f"2 0 obj\n<< /Type /Pages /Kids [{kids_ref}] /Count {len(pages)} >>\nendobj\n".encode("ascii"))
    objects.append(b"3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n")

    for i, page_text in enumerate(pages):
        page_num = 4 + i * 2
        content_num = page_num + 1

        lines = [line.strip() for line in page_text.splitlines() if line.strip()]
        stream_cmds = ["BT", "/F1 11 Tf", "50 750 Td", "14 TL"]
        for line_idx, line in enumerate(lines):
            escaped = _escape_pdf_text(line)
            if line_idx == 0:
                stream_cmds.append(f"({escaped}) Tj")
            else:
                stream_cmds.append(f"T* ({escaped}) Tj")
        stream_cmds.append("ET")
        stream_bytes = "\n".join(stream_cmds).encode("latin-1", errors="replace")

        objects.append(
            f"{page_num} 0 obj\n"
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            f"/Resources << /Font << /F1 3 0 R >> >> /Contents {content_num} 0 R >>\n"
            f"endobj\n".encode("ascii")
        )
        objects.append(
            f"{content_num} 0 obj\n<< /Length {len(stream_bytes)} >>\nstream\n".encode("ascii")
            + stream_bytes
            + b"\nendstream\nendobj\n"
        )

    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(out))
        out.extend(obj)

    xref_pos = len(out)
    out.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    out.extend(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        out.extend(f"{off:010d} 00000 n \n".encode("ascii"))

    out.extend(
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode(
            "ascii"
        )
    )
    return bytes(out)

