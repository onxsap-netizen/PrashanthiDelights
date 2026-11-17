# Prashanthi Delights: backend (Render + MongoDB Atlas)

1. Upload these files to a new GitHub repository (unzip first). Do not upload a real `.env`.
2. Create a free MongoDB Atlas cluster and copy its connection string.
3. In Render choose New > Web Service (or Blueprint) and connect the repository. Settings come from `render.yaml`.
4. Set environment variables: `MONGO_URL`, `ADMIN_PASSWORD`, `CORS_ORIGINS` (your Vercel address). See `.env.example`.
5. After deploy, open the Render Shell and run `python seed.py` once to load the menu.

Local run: `pip install -r requirements.txt && cp .env.example .env && python seed.py && uvicorn server:app --port 8001`
