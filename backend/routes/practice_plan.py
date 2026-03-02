import json
from typing import Optional, Literal, Dict, Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from openai import OpenAI

from backend.supabase_client import supabase

router = APIRouter()
client = OpenAI()

class PracticePlanRequest(BaseModel):
    song_title: str
    artist: Optional[str] = None
    minutes_per_day: int = 15
    skill_level: Optional[Literal["beginner", "intermediate", "advanced"]] = None

SYSTEM_PROMPT = """
You are GuitarCoach, a guitar instructor/organizer. Output ONLY valid JSON with no markdown and no extra text.

Generate a detailed weekly practice plan (Sunday - Saturday) for learning a specific song.

Each day should follow this exact JSON format:

{
  "song_title": "string",
  "artist": "string",
  "skill_level": "string",
  "weekly_goal": {
    "description": "string — overarching goal for the week",
    "milestones": ["string", "string", "string"]
  },
  "days": [
    {
      "day": "Monday",
      "focus": "string — one-line summary of today's focus",
      "tasks": [
        {
          "title": "string — short task name",
          "duration_minutes": number,
          "technique": "string — specific technique being practiced",
          "instructions": "string — step by step instructions on what to do",
          "why": "string — explanation of why this task helps them learn the song",
          "milestone": "string — measurable goal to hit before moving on (e.g. play at 60 BPM cleanly 3x in a row)"
        }
      ]
    }
  ]
}

Rules:
- Distribute tasks so total duration per day matches the user's minutes_per_day.
- Make every task specific to the song and skill level.
- Milestones must be concrete and measurable.
- The 'why' field must explain the musical reason.
- Do NOT include any YouTube links or external URLs.
"""

@router.post("/api/practice-plan")
async def practice_plan(req: PracticePlanRequest, request: Request):
    auth_header = request.headers.get("authorization", "")
    token = auth_header.replace("Bearer ", "")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        supabase.auth.get_user(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    skill_level = req.skill_level or "beginner"

    payload: Dict[str, Any] = {
        "song_title": req.song_title,
        "artist": req.artist,
        "skill_level": skill_level,
        "minutes_per_day": req.minutes_per_day,
    }

    try:
        resp = client.responses.create(
            model="gpt-4o-mini",
            input=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(payload)},
            ],
        )

        raw = (resp.output_text or "").strip()

        # protective measure for if the ai model wraps response in "'''"
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        plan = json.loads(raw)
        return plan

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Model did not return valid JSON.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Practice plan generation failed: {e}")