# backend/routes/practice_plan.py
import json
import os
from typing import List, Optional, Literal, Dict, Any

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from openai import OpenAI

from backend.supabase_client import supabase

router = APIRouter()
client = OpenAI()

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"

async def search_youtube(query: str) -> Optional[Dict]:
    """Search YouTube and return the top result as a resource dict."""
    if not YOUTUBE_API_KEY:
        return None
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": 1,
        "key": YOUTUBE_API_KEY,
    }
    async with httpx.AsyncClient() as http:
        resp = await http.get(YOUTUBE_SEARCH_URL, params=params, timeout=5)
        resp.raise_for_status()
        items = resp.json().get("items", [])
        if not items:
            return None
        item = items[0]
        video_id = item["id"]["videoId"]
        title = item["snippet"]["title"]
        return {
            "title": title,
            "url": f"https://www.youtube.com/watch?v={video_id}",
        }

class PracticePlanRequest(BaseModel):
    song_title: str
    artist: Optional[str] = None
    minutes_per_day: int = 15
    skill_level: Optional[Literal["beginner", "intermediate", "advanced"]] = None

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
        "rules": [
            "Return ONLY valid JSON. No markdown or extra text.",
            "Make the plan specific to the song provided.",
            # Key change: ask for search queries, NOT urls
            "For resources, provide YouTube search queries (not URLs) as 'search_query' strings.",
            "Include 2-3 resource objects, each with a 'title' (descriptive label) and 'search_query'.",
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
                        "Output ONLY valid JSON. Provide a weekly practice plan (Monday–Friday) "
                        "with goals, tasks, and resource search queries. "
                        "Example resource: {\"title\": \"Beginner chord tutorial\", \"search_query\": \"Wonderwall Oasis guitar tutorial beginner\"}"
                    ),
                },
                {"role": "user", "content": json.dumps(payload)},
            ],
        )

        raw = (resp.output_text or "").strip()
        plan = json.loads(raw)

        # Replace AI-generated search queries with real YouTube links
        resources = plan.get("resources", [])
        real_resources = []
        for r in resources[:3]:
            query = r.get("search_query") or r.get("title", "")
            if not query:
                continue
            result = await search_youtube(f"{query} guitar tutorial")
            if result:
                real_resources.append(result)

        plan["resources"] = real_resources
        return plan

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Model did not return valid JSON.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Practice plan generation failed: {e}")