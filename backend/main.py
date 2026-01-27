from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from backend.supabase_client import supabase

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
