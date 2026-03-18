# Guitar-Coach

Team Repository for 115a Project

## Prerequisites

- Python 3.12+
- Node.js (v18+ recommended)
- npm

## Setup

### 1. Backend Setup

Create and activate a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r backend/requirements.txt
```

Create a `.env` file in the `backend/` directory with the following variables:

```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=your_spotify_redirect_uri
FRONTEND_URL=http://localhost:5173
OPENAI_API_KEY=your_openai_api_key
```

### 2. Frontend Setup

Navigate to the frontend directory and install dependencies:

```bash
cd guitarcoach
npm install
```

Create a `.env` file in the `guitarcoach/` directory with your Supabase credentials (check existing `.env` for required variables).

## Running the Application

### Start the Backend

From the project root (with virtual environment activated):

```bash
cd backend
uvicorn main:app --reload
```

The backend will run on `http://localhost:8000`

### Start the Frontend

In a separate terminal, from the `guitarcoach` directory:

```bash
cd guitarcoach
npm run dev
```

The frontend will run on `http://localhost:5173`