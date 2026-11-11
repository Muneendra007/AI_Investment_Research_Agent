"""Configuration loader for the Investment Committee & RAG backend."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Load .env.local first (Next.js convention), then .env without clobbering existing env
load_dotenv(PROJECT_ROOT / ".env.local", override=False)
load_dotenv(PROJECT_ROOT / ".env", override=False)


@dataclass(frozen=True)
class Settings:
    """Runtime settings for storage, RAG, LLM providers, and risk enforcement."""

    data_dir: Path
    uploads_dir: Path
    vectordb_dir: Path
    doc_registry_path: Path
    default_risk_veto_threshold: int
    embedding_model: str
    chunk_size: int
    chunk_overlap: int
    retrieval_top_k: int
    min_retrieval_score: float


def get_settings() -> Settings:
    """Resolve current settings from environment variables."""
    raw_data_dir = os.environ.get("COMMITTEE_DATA_DIR", str(PROJECT_ROOT / "data"))
    data_dir = Path(raw_data_dir)
    uploads_dir = data_dir / "uploads"
    vectordb_dir = data_dir / "vectordb"
    doc_registry_path = data_dir / "documents.json"

    raw_threshold = os.environ.get("RISK_VETO_THRESHOLD", "70")
    try:
        threshold = max(0, min(100, int(raw_threshold)))
    except ValueError:
        threshold = 70

    return Settings(
        data_dir=data_dir,
        uploads_dir=uploads_dir,
        vectordb_dir=vectordb_dir,
        doc_registry_path=doc_registry_path,
        default_risk_veto_threshold=threshold,
        embedding_model=os.environ.get("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5"),
        chunk_size=900,
        chunk_overlap=150,
        retrieval_top_k=6,
        min_retrieval_score=0.2,
    )
