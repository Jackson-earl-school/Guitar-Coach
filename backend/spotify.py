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


async def get_valid_spotify_token(user_id: str) -> str:
    """Get a valid Spotify token, refreshing if expired."""

    # Get tokens from database
    result = supabase.table("profiles").select(
        "spotify_access_token, spotify_refresh_token, spotify_token_expires_at"
    ).eq("id", user_id).single().execute()

    access_token = result.data.get("spotify_access_token")
    refresh_token = result.data.get("spotify_refresh_token")
    expires_at_str = result.data.get("spotify_token_expires_at")

    if not access_token or not refresh_token:
        return None

    # Check if token is expired (with 5 minute buffer)
    if expires_at_str:
        expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
        if datetime.now(timezone.utc) < expires_at - timedelta(minutes=5):
            # Token still valid
            return access_token

    # Token expired - refresh it
    print(f"Refreshing Spotify token for user {user_id}")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://accounts.spotify.com/api/token",
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )

    if response.status_code != 200:
        print(f"Token refresh failed: {response.text}")
        return None

    tokens = response.json()
    new_access_token = tokens["access_token"]
    # Spotify may or may not return a new refresh token
    new_refresh_token = tokens.get("refresh_token", refresh_token)
    expires_in = tokens["expires_in"]
    new_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    # Update database with new tokens
    supabase.table("profiles").update({
        "spotify_access_token": new_access_token,
        "spotify_refresh_token": new_refresh_token,
        "spotify_token_expires_at": new_expires_at.isoformat(),
    }).eq("id", user_id).execute()

    print(f"Token refreshed successfully for user {user_id}")
    return new_access_token


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
    try: 
        result = supabase.table("profiles").update({
            "spotify_access_token": access_token,
            "spotify_refresh_token": refresh_token,
            "spotify_token_expires_at": expires_at.isoformat(),
        }).eq("id", user_id).execute()
        print(f"Database update result: {result}")
    except Exception as e:
        print(f"Databse udpate error: {e}")
        return RedirectResponse(f"{FRONTEND_URL}/profile?spotify_error=db_update_failed")

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


# get top tracks
@router.get("/top-tracks")
async def get_top_tracks(request: Request, limit: int = 20, time_range: str = "medium_term"):
    auth_header = request.headers.get("authorization", "")
    token = auth_header.replace("Bearer ", "")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        user_response = supabase.auth.get_user(token)
        user_id = user_response.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    spotify_token = await get_valid_spotify_token(user_id)

    if not spotify_token:
        raise HTTPException(status_code=400, detail="Spotify not connected")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.spotify.com/v1/me/top/tracks",
            params={"limit": limit, "time_range": time_range},
            headers={"Authorization": f"Bearer {spotify_token}"}
        )

    if response.status_code != 200:
        print(f"Spotify API error: {response.status_code} - {response.text}")
        raise HTTPException(status_code=response.status_code, detail="Spotify API error")

    return response.json()


# get top artists
@router.get("/top-artists")
async def get_top_artists(request: Request, limit: int = 20, time_range: str = "medium_term"):
    auth_header = request.headers.get("authorization", "")
    token = auth_header.replace("Bearer ", "")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        user_response = supabase.auth.get_user(token)
        user_id = user_response.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    spotify_token = await get_valid_spotify_token(user_id)

    if not spotify_token:
        raise HTTPException(status_code=400, detail="Spotify not connected")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.spotify.com/v1/me/top/artists",
            params={"limit": limit, "time_range": time_range},
            headers={"Authorization": f"Bearer {spotify_token}"}
        )

    if response.status_code != 200:
        print(f"Spotify API error: {response.status_code} - {response.text}")
        raise HTTPException(status_code=response.status_code, detail="Spotify API error")

    return response.json()


# get recently played
@router.get("/recently-played")
async def get_recently_played(request: Request, limit: int = 20):
    auth_header = request.headers.get("authorization", "")
    token = auth_header.replace("Bearer ", "")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        user_response = supabase.auth.get_user(token)
        user_id = user_response.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    spotify_token = await get_valid_spotify_token(user_id)

    if not spotify_token:
        raise HTTPException(status_code=400, detail="Spotify not connected")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.spotify.com/v1/me/player/recently-played",
            params={"limit": limit},
            headers={"Authorization": f"Bearer {spotify_token}"}
        )

    if response.status_code != 200:
        print(f"Spotify API error: {response.status_code} - {response.text}")
        raise HTTPException(status_code=response.status_code, detail="Spotify API error")

    return response.json()