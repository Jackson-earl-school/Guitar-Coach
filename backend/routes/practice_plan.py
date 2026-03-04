import json
from typing import Optional, Literal, Dict, Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from openai import OpenAI

from supabase_client import supabase

router = APIRouter()
client = OpenAI()

class PracticePlanRequest(BaseModel):
    song_title: str
    artist: str
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

# parse the practice time from questionnaire json
def parse_minutes(practicing: str) -> int:
    mapping = {
        "15 minutes": 15,
        "30 minutes": 30,
        "1 hour": 60,
        "more than 1 hour": 90,
    }
    return mapping.get(practicing.lower().strip(), 15) # if unable to parse, return 15


@router.post("/api/practice-plan")
async def practice_plan(req: PracticePlanRequest, request: Request):
    auth_header = request.headers.get("authorization", "")
    token = auth_header.replace("Bearer ", "")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # verify token and get user id
    try:
        user_resp = supabase.auth.get_user(token)
        user_id = user_resp.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # fetch questionnaire answers from profiles table
    try:
        profile = (
            supabase.table("profiles")
            .select("questionnaire_answers")
            .eq("id", user_id)
            .single()
            .execute()
        )
        answers: dict = profile.data.get("questionnaire_answers") or {}
    except Exception:
        answers = {}

    # pull minutes from questionnaire, fall back to defaults
    minutes_per_day = parse_minutes(answers.get("practicing", "15 minutes"))

    skill_level = req.skill_level or "beginner"

    payload: Dict[str, Any] = {
        "song_title": req.song_title,
        "artist": req.artist,
        "skill_level": skill_level,
        "minutes_per_day": minutes_per_day,
        # pass extra context so the ai can tailor the plan further
        "play_style": answers.get("play_style", []),
        "techniques": answers.get("techniques", {}),
        "technical_skills": answers.get("technical skills", []),
        "goal": answers.get("goal", ""),
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

        plan = json.loads(raw)
        return plan

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Model did not return valid JSON.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Practice plan generation failed: {e}")