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

def parse_minutes(practicing: str) -> int:
    mapping = {
        "15 minutes": 15,
        "30 minutes": 30,
        "1 hour": 60,
        "more than 1 hour": 90,
    }
    return mapping.get(practicing.lower().strip(), 15)


# save a practice plan
@router.post("/api/practice-plan/save")
async def save_practice_plan(request: Request):
    auth_header = request.headers.get("authorization", "")
    token = auth_header.replace("Bearer ", "")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        user_resp = supabase.auth.get_user(token)
        user_id = user_resp.user.id
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

    try:
        body = await request.json()
        plan = body.get("plan")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request body.")

    if not plan:
        raise HTTPException(status_code=400, detail="No plan provided.")

    try:
        supabase.table("practice_plans").insert({
            "user_id": user_id,
            "song_title": plan.get("song_title", ""),
            "artist": plan.get("artist", ""),
            "plan": plan,
        }).execute()
        return {"message": "Plan saved."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save plan: {e}")


# get all saved practice plans
@router.get("/api/practice-plan/saved")
async def get_saved_plans(request: Request):
    auth_header = request.headers.get("authorization", "")
    token = auth_header.replace("Bearer ", "")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        user_resp = supabase.auth.get_user(token)
        user_id = user_resp.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    try:
        resp = (
            supabase.table("practice_plans")
            .select("id, song_title, artist, plan, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return resp.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch plans: {e}")


# delete a saved practice plan
@router.delete("/api/practice-plan/saved/{plan_id}")
async def delete_practice_plan(plan_id: str, request: Request):
    auth_header = request.headers.get("authorization", "")
    token = auth_header.replace("Bearer ", "")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        user_resp = supabase.auth.get_user(token)
        user_id = user_resp.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    try:
        supabase.table("practice_plans").delete().eq("id", plan_id).eq("user_id", user_id).execute()
        return {"message": "Plan deleted."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete plan: {e}")


# generate a practice plan
@router.post("/api/practice-plan")
async def practice_plan(req: PracticePlanRequest, request: Request):
    auth_header = request.headers.get("authorization", "")
    token = auth_header.replace("Bearer ", "")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        user_resp = supabase.auth.get_user(token)
        user_id = user_resp.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

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

    minutes_per_day = parse_minutes(answers.get("practicing", "15 minutes"))
    skill_level = req.skill_level or "beginner"

    payload: Dict[str, Any] = {
        "song_title": req.song_title,
        "artist": req.artist,
        "skill_level": skill_level,
        "minutes_per_day": minutes_per_day,
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


##### PROGRESS TRACKING ENDPOINTS #####

# insert a task into table

class CompletedTaskRequest(BaseModel):
    plan_id: str
    day_name: str
    task_index: int
    task_title: str
    technique: Optional[str] = None
    duration_minutes: Optional[int] = None

@router.post("/api/practice-plan/complete-task")
async def complete_task(request: Request, req: CompletedTaskRequest):
  auth_header = request.headers.get("authorization", "")
  token = auth_header.replace("Bearer ", "")

  if not token:
      raise HTTPException(status_code=401, detail="Not authenticated")

  try:
      user_resp = supabase.auth.get_user(token)
      user_id = user_resp.user.id
  except Exception:
      raise HTTPException(status_code=401, detail="Invalid token")

  try:
      supabase.table("task_completions").insert({
          "user_id": user_id,
          "practice_plan_id": req.plan_id,
          "day_name": req.day_name,
          "task_title": req.task_title,
          "task_index": req.task_index,
          "technique": req.technique,
          "duration_minutes": req.duration_minutes
      }).execute()
      return {"message": "Task marked as complete."}
  except Exception as e:
      raise HTTPException(status_code=500, detail=f"Failed to complete task: {e}")

# removing a tasks from the completed
@router.delete("/api/practice-plan/complete-task")
async def uncomplete_task(request: Request, plan_id: str, day_name: str, task_index: int):
  auth_header = request.headers.get("authorization", "")
  token = auth_header.replace("Bearer ", "")

  if not token:
      raise HTTPException(status_code=401, detail="Not authenticated")

  try:
      user_resp = supabase.auth.get_user(token)
      user_id = user_resp.user.id
  except Exception:
      raise HTTPException(status_code=401, detail="Invalid token")

  try:
      supabase.table("task_completions") \
          .delete() \
          .eq("user_id", user_id) \
          .eq("practice_plan_id", plan_id) \
          .eq("day_name", day_name) \
          .eq("task_index", task_index) \
          .execute()
      return {"message": "Completed task deleted."}
  except Exception as e:
      raise HTTPException(status_code=500, detail=f"Failed to delete completed task: {e}")
  
#return a list of the completed-stats
@router.get("/api/practice-plan/completions/{plan_id}")
async def completions(request: Request, plan_id: str):
    auth_header = request.headers.get("authorization", "")
    token = auth_header.replace("Bearer ", "")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        user_resp = supabase.auth.get_user(token)
        user_id = user_resp.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        resp = supabase.table("task_completions") \
            .select("*") \
            .eq("user_id", user_id) \
            .eq("practice_plan_id", plan_id) \
            .execute()
        return resp.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch completions: {e}")
  
# returns all stats
@router.get("/api/practice-plan/completion-stats")
async def completion_stats(request: Request):
    auth_header = request.headers.get("authorization", "")
    token = auth_header.replace("Bearer ", "")

    if not token:
        raise HTTPException(status_code=401, detail="Not Authenticated")
    
    try:
        user_resp = supabase.auth.get_user(token)
        user_id = user_resp.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    

    try: 
        resp = supabase.table("task_completions") \
            .select("technique, duration_minutes") \
            .eq("user_id", user_id) \
            .execute()
        
        completions = resp.data
        total_minutes = sum(c.get("duration_minutes") or 0 for c in completions)

        # Group by technique
        by_technique = {}
        for c in completions:
            tech = c.get("technique") or "general"
            mins = c.get("duration_minutes") or 0
            by_technique[tech] = by_technique.get(tech, 0) + mins

        return {
            "total_completed": len(completions),
            "total_minutes": total_minutes,
            "by_technique": by_technique
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {e}")
    

    