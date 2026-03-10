import os
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from supabase_client import supabase
from spotify import router as spotify_router
from recommendation import router as recommendation_router
from routes.practice_plan import router as practice_plan_router

from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

FRONTEND_URL = os.environ["FRONTEND_URL"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recommendation_router)
app.include_router(spotify_router)
app.include_router(practice_plan_router)

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

@app.get("/api/me")
async def get_current_user(request: Request):
    token = request.headers.get("authorization", "").replace("Bearer ", "")
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")
    user = supabase.auth.get_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user
