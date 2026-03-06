#!/bin/bash
# Run these commands in order from inside the arenaix folder

cd "$(dirname "$0")"  # moves you into worker/ folder

# 1. Run schema
npx wrangler d1 execute arenaix-db --remote --file=schema.sql

# 2. Set OpenAI key
npx wrangler secret put OPENAI_API_KEY --name arenaix-engine

# 3. Deploy
npx wrangler deploy

# 4. Copy the worker URL shown
#    Add to Vercel env vars: NEXT_PUBLIC_ARENA_API = <that URL>
