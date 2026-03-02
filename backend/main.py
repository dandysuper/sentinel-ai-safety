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
    AILUMINATE = "MLCommons AILuminate"
    CALYPSOAI = "CalypsoAI CASI"
    PHARE = "Phare (Giskard)"


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


class AILuminateFetcher:
    """Serve MLCommons AILuminate v1.0 safety benchmark results.

    Source: https://ailuminate.mlcommons.org/
    Evaluates AI safety across 12 hazard categories using a 5-tier grading
    scale (Poor -> Excellent). Results are embedded from the official v1.0
    benchmark release covering 28+ models.
    """

    SAFETY_PROFILE_MAPPING = {
        "Non-toxicity": ["hate", "sexual_content", "defamation"],
        "Non-stereotype": ["defamation", "hate"],
        "Adversarial robustness": ["violent_crimes", "nonviolent_crimes", "indiscriminate_weapons"],
        "OOD robustness": ["specialized_advice", "intellectual_property"],
        "Robustness to adversarial demos": ["sex_crimes", "child_exploitation", "suicide_self_harm"],
        "Privacy": ["privacy"],
        "Ethics": ["violent_crimes", "sex_crimes", "child_exploitation", "suicide_self_harm", "indiscriminate_weapons"],
        "Fairness": ["hate", "defamation", "intellectual_property"],
    }

    def __init__(self) -> None:
        from data.ailuminate_v1 import AILUMINATE_RESULTS, HAZARD_LABELS
        self._data = AILUMINATE_RESULTS
        self._labels = HAZARD_LABELS

    def fetch(self, limit_models: int = 50) -> list[BenchmarkResult]:
        results: list[BenchmarkResult] = []

        for entry in self._data[:limit_models]:
            model_name = entry["model_name"]
            hazard_scores: dict = entry.get("hazard_scores", {})

            for profile_metric, hazard_keys in self.SAFETY_PROFILE_MAPPING.items():
                vals = [hazard_scores[k] for k in hazard_keys if k in hazard_scores]
                if not vals:
                    continue
                score = round(sum(vals) / len(vals), 1)
                results.append(
                    BenchmarkResult(
                        model_name=model_name,
                        source=BenchmarkSource.AILUMINATE.value,
                        safety_score=score,
                        metric=profile_metric,
                        raw_score=score,
                        score_scale="0-100",
                    )
                )

            for hazard_key, label in self._labels.items():
                if hazard_key in hazard_scores:
                    results.append(
                        BenchmarkResult(
                            model_name=model_name,
                            source=BenchmarkSource.AILUMINATE.value,
                            safety_score=float(hazard_scores[hazard_key]),
                            metric=label,
                            raw_score=float(hazard_scores[hazard_key]),
                            score_scale="0-100",
                        )
                    )

            all_scores = [float(v) for v in hazard_scores.values()]
            if all_scores:
                avg = round(sum(all_scores) / len(all_scores), 1)
                results.append(
                    BenchmarkResult(
                        model_name=model_name,
                        source=BenchmarkSource.AILUMINATE.value,
                        safety_score=avg,
                        metric="Safety Average",
                        raw_score=None,
                        score_scale="0-100",
                    )
                )

        return results


class CalypsoAIFetcher:
    """Serve CalypsoAI Security Index (CASI) and Agentic Warfare Resistance (AWR)
    benchmark results.

    Source: https://calypsoai.com/calypsoai-model-leaderboard/
    CASI measures resistance to prompt injection and jailbreak attacks (0-100).
    AWR measures resistance to multi-step agentic attack scenarios (0-100).
    Data reflects Sep 2025 edition with historical editions Feb-Sep 2025.
    """

    def __init__(self) -> None:
        from data.calypsoai_casi import CALYPSOAI_RESULTS
        self._data = CALYPSOAI_RESULTS

    def fetch(self, limit_models: int = 50) -> list[BenchmarkResult]:
        results: list[BenchmarkResult] = []
        source = BenchmarkSource.CALYPSOAI.value

        for entry in self._data[:limit_models]:
            model_name = entry["model_name"]
            casi = entry.get("casi_score")
            awr = entry.get("awr_score")
            perf = entry.get("performance_index")

            if casi is not None and math.isfinite(float(casi)):
                results.append(BenchmarkResult(
                    model_name=model_name,
                    source=source,
                    safety_score=float(casi),
                    metric="CASI (Jailbreak & Injection Resistance)",
                    raw_score=float(casi),
                    score_scale="0-100",
                ))

            if awr is not None and math.isfinite(float(awr)):
                results.append(BenchmarkResult(
                    model_name=model_name,
                    source=source,
                    safety_score=float(awr),
                    metric="AWR (Agentic Warfare Resistance)",
                    raw_score=float(awr),
                    score_scale="0-100",
                ))

            if casi is not None and awr is not None:
                avg = round((float(casi) + float(awr)) / 2, 1)
                results.append(BenchmarkResult(
                    model_name=model_name,
                    source=source,
                    safety_score=avg,
                    metric="Safety Average",
                    raw_score=None,
                    score_scale="0-100",
                ))

        return results


class PhareFetcher:
    """Serve Phare (Giskard AI) multilingual safety benchmark results.

    Source: https://phare.giskard.ai/
    Evaluates LLMs across: factuality, bias, harmfulness, jailbreak resistance,
    and prompt injection resistance. Scores are 0-100, higher is better.
    Data reflects January 2026 leaderboard update.
    """

    METRIC_WEIGHTS = {
        "factuality": 0.15,
        "bias": 0.15,
        "harmfulness": 0.25,
        "jailbreak_encoding": 0.20,
        "jailbreak_framing": 0.15,
        "prompt_injection": 0.10,
    }

    def __init__(self) -> None:
        from data.phare_giskard import PHARE_RESULTS, PHARE_SCORE_LABELS
        self._data = PHARE_RESULTS
        self._labels = PHARE_SCORE_LABELS

    def fetch(self, limit_models: int = 50) -> list[BenchmarkResult]:
        results: list[BenchmarkResult] = []
        source = BenchmarkSource.PHARE.value

        for entry in self._data[:limit_models]:
            model_name = entry["model_name"]
            scores = entry.get("scores", {})

            weighted_sum = 0.0
            weight_total = 0.0
            for key, label in self._labels.items():
                val = scores.get(key)
                if val is None or not math.isfinite(float(val)):
                    continue
                score = float(val)
                results.append(BenchmarkResult(
                    model_name=model_name,
                    source=source,
                    safety_score=score,
                    metric=label,
                    raw_score=score,
                    score_scale="0-100",
                ))
                w = self.METRIC_WEIGHTS.get(key, 1.0)
                weighted_sum += score * w
                weight_total += w

            if weight_total > 0:
                avg = round(weighted_sum / weight_total, 1)
                results.append(BenchmarkResult(
                    model_name=model_name,
                    source=source,
                    safety_score=avg,
                    metric="Safety Average",
                    raw_score=None,
                    score_scale="0-100",
                ))

        return results


# --- Aggregator Service ---


class BenchmarkAggregator:
    def __init__(self):
        self.hf = HuggingFaceSafetyFetcher()
        self.ailuminate = AILuminateFetcher()
        self.calypsoai = CalypsoAIFetcher()
        self.phare = PhareFetcher()

    def aggregate_benchmarks(
        self,
        sources: Optional[list[str]] = None,
        limit_per_source: int = 50,
        sort_by: str = "safety_score",
        sort_desc: bool = True,
    ) -> list[BenchmarkResult]:
        source_lower = [s.lower() for s in sources] if sources else None
        fetch_hf = source_lower is None or "huggingface" in source_lower
        fetch_ai = source_lower is None or "ailuminate" in source_lower
        fetch_casi = source_lower is None or "calypsoai" in source_lower or "casi" in source_lower
        fetch_phare = source_lower is None or "phare" in source_lower or "giskard" in source_lower

        all_results: list[BenchmarkResult] = []
        if fetch_ai:
            all_results.extend(self.ailuminate.fetch(limit_models=limit_per_source))
        if fetch_casi:
            all_results.extend(self.calypsoai.fetch(limit_models=limit_per_source))
        if fetch_phare:
            all_results.extend(self.phare.fetch(limit_models=limit_per_source))
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
