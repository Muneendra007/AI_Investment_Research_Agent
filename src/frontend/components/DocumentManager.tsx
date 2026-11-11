"use client";

import { useState, useRef } from "react";
import type { CommitteeDocument } from "@/frontend/types";

interface DocumentManagerProps {
  documents: CommitteeDocument[];
  selectedDocIds: string[];
  onToggleDoc: (docId: string) => void;
  onSelectAll: () => void;
  onDocumentsChanged: () => Promise<void>;
  disabled?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function DocumentManager({
  documents,
  selectedDocIds,
  onToggleDoc,
  onSelectAll,
  onDocumentsChanged,
  disabled = false,
}: DocumentManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || uploading || disabled) return;

    setUploading(true);
    setStatusMessage(null);

    try {
      const formData = new FormData();
      Array.from(fileList).forEach((file) => {
        formData.append("file", file, file.name);
      });

      const res = await fetch("/api/committee/documents", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      const uploadedCount = Array.isArray(data.uploaded) ? data.uploaded.length : 0;
      const errList: string[] = Array.isArray(data.errors) ? data.errors : [];

      await onDocumentsChanged();

      if (errList.length > 0 && uploadedCount > 0) {
        setStatusMessage({
          type: "error",
          text: `Indexed ${uploadedCount} PDF(s), with warnings: ${errList.join(" | ")}`,
        });
      } else if (errList.length > 0) {
        setStatusMessage({
          type: "error",
          text: errList.join(" | "),
        });
      } else {
        setStatusMessage({
          type: "success",
          text: `Indexed ${uploadedCount} PDF document${uploadedCount === 1 ? "" : "s"} into persistent vector store.`,
        });
      }
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: error instanceof Error ? error.message : "PDF upload failed",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (docId: string) => {
    if (deletingId || disabled) return;
    setDeletingId(docId);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/committee/documents/${encodeURIComponent(docId)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete document");
      }
      await onDocumentsChanged();
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Delete failed",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-sm">
            📄
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Supporting PDF Evidence Vault (Persistent RAG)
            </h3>
            <p className="text-[11px] text-slate-400">
              Upload 10-Ks, earnings releases, memos, or investor decks — chunked &amp; indexed with page citations
            </p>
          </div>
        </div>
        {documents.length > 0 && (
          <button
            type="button"
            onClick={onSelectAll}
            disabled={disabled}
            className="text-[11px] font-medium px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 cursor-pointer disabled:opacity-40"
          >
            {selectedDocIds.length === documents.length ? "Deselect All" : "Select All"} (
            {selectedDocIds.length}/{documents.length})
          </button>
        )}
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !uploading) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleUploadFiles(e.dataTransfer.files);
        }}
        className={`rounded-xl border-2 border-dashed p-5 text-center transition-all ${
          dragActive
            ? "border-blue-400 bg-blue-950/30"
            : "border-slate-700/80 bg-slate-950/40 hover:border-slate-600"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          disabled={uploading || disabled}
          onChange={(e) => handleUploadFiles(e.target.files)}
          className="hidden"
          id="committee-pdf-upload"
        />
        <div className="flex flex-col items-center gap-2">
          <span className="text-xl">{uploading ? "⏳" : "📥"}</span>
          <p className="text-xs text-slate-300">
            {uploading
              ? "Extracting pages, sanitizing untrusted directives, generating embeddings & storing in Qdrant..."
              : "Drag and drop supporting PDF files here, or browse to upload"}
          </p>
          <button
            type="button"
            disabled={uploading || disabled}
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary px-4 py-1.5 text-xs disabled:opacity-40"
          >
            {uploading ? "Indexing PDF..." : "Upload Supporting PDFs"}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`text-xs px-3 py-2 rounded-lg border ${
            statusMessage.type === "success"
              ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
              : "bg-rose-950/30 border-rose-500/30 text-rose-300"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Document List */}
      {documents.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-2">
          No PDF documents indexed yet. Upload at least one PDF document for grounded committee analysis.
        </p>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {documents.map((doc) => {
            const isSelected = selectedDocIds.includes(doc.doc_id);
            const hasWarnings = doc.injection_warnings && doc.injection_warnings.length > 0;
            return (
              <div
                key={doc.doc_id}
                className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                  isSelected
                    ? "bg-blue-950/20 border-blue-500/40"
                    : "bg-slate-900/50 border-white/5"
                }`}
              >
                <label className="flex items-start gap-2.5 flex-1 min-w-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={disabled}
                    onChange={() => onToggleDoc(doc.doc_id)}
                    className="mt-1 rounded border-slate-600 bg-slate-800 text-blue-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-slate-100 truncate">
                        {doc.filename}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5">
                        {doc.page_count} {doc.page_count === 1 ? "page" : "pages"} · {doc.chunk_count} chunks
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {formatBytes(doc.file_size_bytes)}
                      </span>
                      {hasWarnings && (
                        <span
                          title={doc.injection_warnings.join("\n")}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30"
                        >
                          ⚠️ Prompt Injection Neutralized ({doc.injection_warnings.length})
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                      ID: {doc.doc_id} · Uploaded {new Date(doc.uploaded_at).toLocaleString()}
                    </p>
                  </div>
                </label>

                <button
                  type="button"
                  onClick={() => handleDelete(doc.doc_id)}
                  disabled={disabled || deletingId === doc.doc_id}
                  className="text-[11px] px-2.5 py-1 rounded-lg border border-rose-500/25 bg-rose-950/20 text-rose-300 hover:bg-rose-900/30 cursor-pointer disabled:opacity-40"
                >
                  {deletingId === doc.doc_id ? "Removing..." : "Delete"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

