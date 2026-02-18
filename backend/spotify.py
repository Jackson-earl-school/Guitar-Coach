import os
import httpx
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse
from supabase_client import supabase

router = APIRouter(prefix="/api/spotify")

CLIENT_ID = os.environ["SPOTIFY_CLIENT_ID"]
CLIENT_SECRET = os.environ["SPOTIFY_CLIENT_SECRET"]
REDIRECT_URI = os.environ["SPOTIFY_REDIRECT_URI"]
FRONTEND_URL = os.environ["FRONTEND_URL"]

SCOPES ="user-read-recently-played user-top-read user-library-read"

@router.get("/login")
async def spotify_login(request: Request):

    # Get user token
    auth_header = request.headers.get("authorization", "")
    token = auth_header.replace("Bearer ", "")

    # no token in header
    if not token:
        token = request.query_params.get("token", "")

    # if no token coming from fontend
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    params = urlencode({
        "client_id": CLIENT_ID,
        "response_type": "code",
        "redirect_uri": REDIRECT_URI,
        "scope": SCOPES,
        "state": token,
    })

    return RedirectResponse(f"https://accounts.spotify.com/authorize?{params}")

@router.get("/callback")
async def spotify_callback(code: str = None, error: str = None, state: str = None): # state = supabase token

    if error:
        return RedirectResponse(f"{FRONTEND_URL}/profile?spotify_error={error}")

    if not code or not state:
        return RedirectResponse(f"{FRONTEND_URL}/profile?spotify_error=missing_params")

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://accounts.spotify.com/api/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": REDIRECT_URI,
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )

    if response.status_code != 200:
        return RedirectResponse(f"{FRONTEND_URL}/profile?spotify_error=token_exchange_failed")

    # response token type = Bearer
    tokens = response.json()
    access_token = tokens["access_token"]
    refresh_token = tokens["refresh_token"]
    expires_in = tokens["expires_in"]
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    # Get user from Supabase using their auth token
    try:
        user_response = supabase.auth.get_user(state)
        user_id = user_response.user.id
    except Exception as e:
        print(f"Error getting user: {e}")
        return RedirectResponse(f"{FRONTEND_URL}/profile?spotify_error=auth_failed")


    # Store tokens in database
    supabase.table("profiles").update({
        "spotify_access_token": access_token,
        "spotify_refresh_token": refresh_token,
        "spotify_token_expires_at": expires_at.isoformat(),
    }).eq("id", user_id).execute()

    return RedirectResponse(f"{FRONTEND_URL}/profile?spotify_connected=true")


# getting current user's Spotify profile
@router.get("/me")
async def get_spotify_profile(request: Request):

    auth_header = request.headers.get("authorization", "")
    token = auth_header.replace("Bearer ", "")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Get user
    try:
        user_response = supabase.auth.get_user(token)
        user_id = user_response.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Get Spotify token from database
    result = supabase.table("profiles").select(
        "spotify_access_token"
    ).eq("id", user_id).single().execute()

    spotify_token = result.data.get("spotify_access_token")

    if not spotify_token:
        raise HTTPException(status_code=400, detail="Spotify not connected")

    # Fetch Spotify profile
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.spotify.com/v1/me",
            headers={"Authorization": f"Bearer {spotify_token}"}
        )

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="Spotify API error")

    return response.json()


# disconnecting a spotify profile
@router.post("/disconnect")
async def disconnect_spotify(request: Request):

    auth_header = request.headers.get("authorization", "")
    token = auth_header.replace("Bearer ", "")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        user_response = supabase.auth.get_user(token)
        user_id = user_response.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    supabase.table("profiles").update({
        "spotify_access_token": None,
        "spotify_refresh_token": None,
        "spotify_token_expires_at": None,
    }).eq("id", user_id).execute()

    return {"status": "disconnected"}
