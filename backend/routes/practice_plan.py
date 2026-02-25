# backend/routes/practice_plan.py
import json
from typing import List, Optional, Literal, Dict, Any
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from openai import OpenAI

from backend.supabase_client import supabase

router = APIRouter()
client = OpenAI()

YOUTUBE_DOMAINS = {"youtube.com", "www.youtube.com", "youtu.be"}

# determine if url is a youtube url
def is_youtube_url(url: str) -> bool:
    # use url library to parse url and check if it is within youtube domains
    try:
        return urlparse(url).netloc.lower() in YOUTUBE_DOMAINS
    except Exception:
        return False

# default values
class PracticePlanRequest(BaseModel):
    song_title: str
    artist: Optional[str] = None

    minutes_per_day: int = 15
    days_per_week: int = 5
    goals: List[str] = Field(default_factory=list)
    struggles: List[str] = Field(default_factory=list)
    skill_level: Optional[Literal["beginner", "intermediate", "advanced"]] = None

@router.post("/api/practice-plan")
async def practice_plan(req: PracticePlanRequest, request: Request):
    # obtain user token
    auth_header = request.headers.get("authorization", "")
    token = auth_header.replace("Bearer ", "")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        supabase.auth.get_user(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    # default skill level for now
    # later obtain from supabase profile table
    skill_level = req.skill_level or "beginner"

    # data to send to openai
    payload: Dict[str, Any] = {
        "song_title": req.song_title,
        "artist": req.artist,
        "skill_level": skill_level,
        "minutes_per_day": req.minutes_per_day,
        "days_per_week": req.days_per_week,
        "goals": req.goals,
        "struggles": req.struggles,
        "rules": [
            "Return ONLY valid JSON. No markdown or extra text.",
            "Make the plan specific to the song provided.",
            "Include YouTube links that would help with goals/struggles.",
            "All URLs must be real YouTube links (youtube.com or youtu.be).",
            "Do NOT invent links. If unsure, omit the resource.",
        ],
    }

    try:
        resp = client.responses.create(
            model="gpt-4o-mini",
            input=[
                {
                    "role": "system",
                    "content": (
                        "You are GuitarCoach, a guitar instructor. "
                        "Output ONLY valid JSON. Provide YouTube links only."
                    ),
                },
                {"role": "user", "content": json.dumps(payload)},
            ],
        )

        raw = (resp.output_text or "").strip()
        plan = json.loads(raw)

        # filter youtube links
        resources = plan.get("resources", [])
        plan["resources"] = [
            r for r in resources
            if isinstance(r.get("url"), str) and is_youtube_url(r["url"])
        ][:3] # limit list to at most 3 items

        return plan

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Model did not return valid JSON.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Practice plan generation failed: {e}")