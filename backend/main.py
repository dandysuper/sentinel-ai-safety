from __future__ import annotations

from pathlib import Path
from typing import Optional
import os
import logging
import math

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from enum import Enum

from huggingface_hub import HfApi

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Local settings storage (backend/.env.local) ---

SETTINGS_ENV_PATH = Path(__file__).resolve().parent / ".env.local"


class AppSettings(BaseModel):
    huggingface_token: Optional[str] = None


def _read_env_file(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    data: dict[str, str] = {}
    for raw in path.read_text("utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        data[k.strip()] = v.strip().strip('"').strip("'")
    return data


def _write_env_file(path: Path, kv: dict[str, str]) -> None:
    lines = [f"{k}={v}" for k, v in kv.items() if v is not None]
    path.write_text("\n".join(lines) + "\n", "utf-8")


def get_hf_token() -> Optional[str]:
    return (
        os.environ.get("HF_TOKEN")
        or os.environ.get("HUGGINGFACEHUB_API_TOKEN")
        or _read_env_file(SETTINGS_ENV_PATH).get("HF_TOKEN")
    )


# --- Pydantic Models ---


class BenchmarkSource(str, Enum):
    HUGGINGFACE = "HuggingFace"


class BenchmarkResult(BaseModel):
    """Unified benchmark result schema."""

    model_name: str
    source: str
    safety_score: float
    metric: str
    raw_score: Optional[float] = None
    score_scale: Optional[str] = None


# --- Utilities ---


class ScoreNormalizer:
    def normalize(self, score: float, custom_range: tuple[float, float]) -> float:
        if not isinstance(score, (int, float)) or not math.isfinite(score):
            return 0.0
        lo, hi = custom_range
        if hi == lo:
            return 0.0
        normalized = ((score - lo) / (hi - lo)) * 100.0
        if not math.isfinite(normalized):
            return 0.0
        return round(min(100.0, max(0.0, normalized)), 1)


# --- Data Fetchers ---


class HuggingFaceSafetyFetcher:
    """Fetch DecodingTrust safety leaderboard results from Hugging Face.

    Source dataset: AI-Secure/llm-trustworthy-leaderboard-results
    Each result JSON contains 8 perspectives with `aggregated-results` (0..1).
    We normalize each to 0..100 (higher is better, per AI-Secure docs).
    """

    DATASET_ID = "AI-Secure/llm-trustworthy-leaderboard-results"

    METRICS = [
        ("toxicity", "Non-toxicity"),
        ("stereotype", "Non-stereotype"),
        ("adv", "Adversarial robustness"),
        ("ood", "OOD robustness"),
        ("adv_demo", "Robustness to adversarial demos"),
        ("privacy", "Privacy"),
        ("ethics", "Ethics"),
        ("fairness", "Fairness"),
    ]

    def __init__(self):
        self.normalizer = ScoreNormalizer()
        self.api = HfApi(token=get_hf_token())

    def fetch(self, limit_models: int = 50) -> list[BenchmarkResult]:
        try:
            files = self.api.list_repo_files(repo_id=self.DATASET_ID, repo_type="dataset")

            # pick latest results_*.json per model folder
            by_folder: dict[str, str] = {}
            for f in files:
                if not f.endswith(".json"):
                    continue
                if f.startswith("."):
                    continue
                folder = f.rsplit("/", 1)[0]
                prev = by_folder.get(folder)
                if prev is None or f > prev:
                    by_folder[folder] = f

            chosen = sorted(by_folder.values(), reverse=True)[: max(1, limit_models)]

            token = get_hf_token()
            headers = {"Accept": "application/json"}
            if token:
                headers["Authorization"] = f"Bearer {token}"

            results: list[BenchmarkResult] = []

            for file_path in chosen:
                url = f"https://huggingface.co/datasets/{self.DATASET_ID}/resolve/main/{file_path}"
                r = requests.get(url, headers=headers, timeout=30)
                if r.status_code != 200:
                    continue

                data = r.json()
                config = data.get("config", {}) or {}
                model_name = config.get("model_name") or data.get("model_name") or file_path.split("/")[0]

                per = data.get("results", {}) or {}
                if not isinstance(per, dict):
                    continue

                scores: list[float] = []
                for key, label in self.METRICS:
                    item = per.get(key)
                    if not isinstance(item, dict):
                        continue
                    raw = item.get("aggregated-results")
                    if not isinstance(raw, (int, float)) or not math.isfinite(float(raw)):
                        continue
                    score = self.normalizer.normalize(float(raw), custom_range=(0.0, 1.0))
                    scores.append(score)
                    results.append(
                        BenchmarkResult(
                            model_name=str(model_name),
                            source=BenchmarkSource.HUGGINGFACE.value,
                            safety_score=score,
                            metric=label,
                            raw_score=float(raw),
                            score_scale="0-1",
                        )
                    )

                if scores:
                    avg = round(sum(scores) / len(scores), 1)
                    results.append(
                        BenchmarkResult(
                            model_name=str(model_name),
                            source=BenchmarkSource.HUGGINGFACE.value,
                            safety_score=avg,
                            metric="Safety Average",
                            raw_score=None,
                            score_scale="0-100",
                        )
                    )

            return results

        except Exception as e:
            logger.warning(f"Failed to fetch HuggingFace safety results: {e}")
            return []


# --- Aggregator Service ---


class BenchmarkAggregator:
    def __init__(self):
        self.hf = HuggingFaceSafetyFetcher()

    def aggregate_benchmarks(
        self,
        sources: Optional[list[str]] = None,
        limit_per_source: int = 50,
        sort_by: str = "safety_score",
        sort_desc: bool = True,
    ) -> list[BenchmarkResult]:
        fetch_hf = sources is None or "huggingface" in [s.lower() for s in sources]

        all_results: list[BenchmarkResult] = []
        if fetch_hf:
            all_results.extend(self.hf.fetch(limit_models=limit_per_source))

        # Drop any non-finite scores to avoid JSON serialization errors
        all_results = [r for r in all_results if isinstance(r.safety_score, (int, float)) and math.isfinite(r.safety_score)]

        if not all_results:
            return []

        # Sort in-memory (avoid pandas NaN/inf issues)
        if sort_by == "safety_score":
            all_results.sort(key=lambda r: r.safety_score, reverse=sort_desc)

        return all_results


# --- FastAPI Application ---

app = FastAPI(
    title="Sentinel AI Safety Benchmark Aggregator",
    description="Aggregates AI safety benchmarks from multiple sources",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

aggregator = BenchmarkAggregator()


@app.get("/api/settings")
async def get_settings():
    token = get_hf_token()
    return {"huggingface": {"configured": bool(token)}}


@app.post("/api/settings")
async def set_settings(payload: AppSettings):
    kv = _read_env_file(SETTINGS_ENV_PATH)
    if payload.huggingface_token is not None:
        kv["HF_TOKEN"] = payload.huggingface_token
    _write_env_file(SETTINGS_ENV_PATH, kv)
    return {"ok": True}


@app.post("/api/settings/test")
async def test_settings():
    try:
        token = get_hf_token()
        headers = {"Accept": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        r = requests.get("https://huggingface.co/api/whoami-v2", headers=headers, timeout=20)
        return {"ok": r.status_code == 200, "status": r.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@app.get("/api/benchmarks", response_model=list[BenchmarkResult])
async def get_benchmarks(
    sources: Optional[str] = None,
    limit: int = 50,
    sort_by: str = "safety_score",
    sort_desc: bool = True,
):
    try:
        source_list = sources.split(",") if sources else None
        return aggregator.aggregate_benchmarks(
            sources=source_list,
            limit_per_source=limit,
            sort_by=sort_by,
            sort_desc=sort_desc,
        )
    except Exception as e:
        logger.error(f"Error fetching benchmarks: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch benchmarks: {str(e)}")


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
