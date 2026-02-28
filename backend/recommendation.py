import os
import json
import httpx
from openai import OpenAI
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel                          # pydantic models validate incoming json. fronted will send user's spotify data
                                                        #     with difficult preferences 
from typing import List, Optional
from supabase_client import supabase
from spotify import get_valid_spotify_token

router = APIRouter(prefix="/api/recommendation")

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

class RecommendationRequest(BaseModel):         
    top_tracks: List[dict]
    top_artists: List[dict]
    current_difficulty: Optional[int] = 3
    adjust_difficulty: Optional[str] = None
    previous_songs: Optional[List[str]] = []

class SimilarRequest(BaseModel):
    type: str
    name: str
    artist_name: Optional[str] = None
    current_difficulty: Optional[int] = 3
    previous_songs: Optional[List[str]] = []

# main endpooint
@router.post("/generate-song")
async def generate_recommendation(request: Request, body: RecommendationRequest):
    # 1. Auth check 
    auth_header = request.headers.get("authorization", "")
    token = auth_header.replace("Bearer ", "")

    if not token:
        raise HTTPException(status_code=401, detail="Not Authenticate")
    
    # 2. Build context strings from music data
    tracks_context = "\n".join([
        f"- {track.get('name')} by {', '.join([a.get('name') for a in track.get('artists', [])])}"
        for track in body.top_tracks[:10]
    ])

    artists_context = "\n".join([
        f"- {artist.get('name')} (genres: ) {', '.join(artist.get('genres', [])[:3])}"
        for artist in body.top_artists[:10]
    ])

    # 3. Handle difficulty adjustment
    target_difficulty = body.current_difficulty
    if body.adjust_difficulty == "up" and target_difficulty < 5:
        target_difficulty += 1
    elif body.adjust_difficulty == "down" and target_difficulty > 1:
        target_difficulty -= 1
    
    # build exclusion list
    exclude_text = ""
    if body.previous_songs:
        exclude_text = f"\n\nDO NOT recommend these songs (they've already been suggested): {', '.join(body.previous_songs)}"

    # 4. prompt
    prompt = f"""You are a guitar teacher helping a student find songs to learn.

        {exclude_text}

        The student's top tracks: {tracks_context}
        The student's top artists: {artists_context}

        Recommend ONE guitar song. You can use the student's listening history
        but don't solely rely on it. You can also recommend another song by the 
        same artist that they enjoy but haven't heard yet.

        Find a song with a difficult of {target_difficulty}/5.

        List why the song would be beneficial to learn and how it relates to 
        their music taste and  write it in the "description" of the song. 
        Also list all the guitar skills that they would develop while learning 
        the song.

        Here is an example output of what I want: 

        Respond with ONLY JSON:
        {{
            "name": "Song Name",
            "artist": "Artist Name",
            "difficulty": {target_difficulty},
            "skills": ["tapping", "bar chords", "fast solo"].  /* get creative with these */
             "description":  /* don't use the same format every time, every song is different */
        }} """
    
    # 5. Call openai
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a guitar song expert. "},
                {"role": "user", "content": prompt}
            ],
            temperature=0.8,    # Higher --> more creative/varied
            max_tokens=500
        )   

        content = response.choices[0].message.content.strip()
        # debug:
        print(f"OpenAI response: {content}")
        # Clean up if GPT wrapped it in markdown code blocks                                                                                                       
        if content.startswith("```"):                                                                                                                              
            content = content.split("```")[1]                                                                                                                      
            if content.startswith("json"):                                                                                                                         
                content = content[4:]                                                                                                                              
            content = content.strip()


        recommentation = json.loads(content)

        return recommentation
    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}, content was: {content}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        print(f"Openai api error: {e}, content was: {content}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
    
# Song generated by specific artist or other track
@router.post("/generate-similar")
async def generate_similar(request: Request, body: SimilarRequest):
    auth_header = request.headers.get("authorization", "")
    token = auth_header.replace("Bearer ", "")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    exclude_text = ""
    if body.previous_songs:
        exclude_text = f"\n\nDO NOT recommend any of these songs (already suggested): {', '.join(body.previous_songs)}"
    
    # Two different prompts for artists / songs
    if body.type == "track":
        prompt = f"""You are a guitar teacher helping a student find songs to learn.
        The student wants to learn a song similar to "{body.name}" by {body.artist_name}

        Recommend ONE guitar song that:
        1. Has a similar style, mood, or guitar techniques to "{body.name}"
        2. Is at difficult level {body.current_difficulty}/5 (1=begginer, 5=expert)
        3. Is NOT "{body.name}" itself 

        {exclude_text}

        Explain in the description why this song is similar to "{body.name}" and what guitar skills they'll develop

        Here is an example output of what I want: 

        Respond with ONLY JSON:
        {{
            "name": "Song Name",
            "artist": "Artist Name",
            "difficulty": {body.current_difficulty},
            "skills": ["skill1", "skill2", "skill3"].  /* get creative with these */
             "description":  /* don't use the same format every time, every song is different */
        }} """
    else: # artist
        prompt = f"""You are a guitar teacher helping a student find songs to learn.
        The student loves {body.artist_name} and wants to learn one of their songs on guitar

        Recommend ONE guitar song that:
        1. It by {body.name} OR is very similar to {body.name}'s style
        2. Is at difficult level {body.current_difficulty}/5 (1=begginer, 5=expert)
        3. Is great for learning guitar.

        {exclude_text}

        Explain in the description why this song fits and what guitar skills they'll develop

        Here is an example output of what I want: 

        Respond with ONLY JSON:
        {{
            "name": "Song Name",
            "artist": "Artist Name",
            "difficulty": {body.current_difficulty},
            "skills": ["skill1", "skill2", "skill3"].  /* get creative with these */
             "description":  /* don't use the same format every time, every song is different */
        }} """
    # 5. Call openai
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a guitar song expert. Always respond with valid JSON only, no markdown code blocks"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.8,    # Higher --> more creative/varied
            max_tokens=500
        )   

        content = response.choices[0].message.content.strip()
        # debug:
        print(f"OpenAI response: {content}")
        # Clean up if GPT wrapped it in markdown code blocks                                                                                                       
        if content.startswith("```"):                                                                                                                              
            content = content.split("```")[1]                                                                                                                      
            if content.startswith("json"):                                                                                                                         
                content = content[4:]                                                                                                                              
            content = content.strip()


        recommentation = json.loads(content)

        return recommentation
    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}, content was: {content}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        print(f"Openai api error: {e}, content was: {content}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

        
## Outputs the album art and artist and gets a preview URL
@router.post("/search-spotify")
async def search_spotify_for_song(request: Request, song_name: str, artist_name: str):
    auth_header = request.headers.get("authorization", "")
    token = auth_header.replace("Bearer ", "")

    if not token:
        raise HTTPException(status_code=401, detail="Not Authenticated")
    
    try:
        user_response = supabase.auth.get_user(token)
        user_id = user_response.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # get valid spotify token 
    spotify_token = await get_valid_spotify_token(user_id)

    if not spotify_token:
        raise HTTPException(status_code=400, detail="Spotify not connected")
    
    # search spotify for the song
    query = f"{song_name} {artist_name}"

    async with httpx.AsyncClient() as http_client:          # open an http connection to receive a response
        response = await http_client.get(
            "https://api.spotify.com/v1/search",
            params={"q": query, "type": "track", "limit": 5},
            headers={"Authorization": f"Bearer {spotify_token}"}
        )

    if response.status_code != 200 :
        return {"found": False, "preview_url": None, "album_image": None, "spotify_id": None}
    
    data = response.json()
    tracks = data.get("tracks", {}).get("items", [])

    if not tracks:
        return {"found": False, "preview_url": None, "album_image": None, "spootify_id": None}
    
    matching_track = None
    artist_name_lower = artist_name.lower()

    for track in tracks:
        track_artists = [a.get("name", "").lower() for a in track.get("artists", [])]
        if any(artist_name_lower in artist or artist in artist_name_lower for artist in track_artists):
            matching_track = track
            break
    
    if not matching_track:
        matching_track = tracks[0]
        print(f"Warning: No exact artist match for '{artist_name}', using first result")
    
    album_images = track.get("album", {}).get("images", [])

    # 4. return preview url and album art
    return {
        "found": True,
        "preview_url": track.get("preview_url"),
        "album_image": album_images[0].get("url") if album_images else None,
        "spotify_id": track.get("id"),
        "matched_name": matching_track.get("name"),
        "matched_artist": ", ".join([a.get("name") for a in matching_track.get("artists", [])])
    }
