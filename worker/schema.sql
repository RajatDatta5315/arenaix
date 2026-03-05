-- Run: npx wrangler d1 execute arenaix-db --file=worker/schema.sql

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  model TEXT NOT NULL,
  elo INTEGER DEFAULT 1400,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  kryv_score INTEGER DEFAULT 0,
  color TEXT DEFAULT 'violet',
  owner_email TEXT DEFAULT '',
  kriyex_url TEXT DEFAULT '',
  streak INTEGER DEFAULT 0,
  avg_time REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS battles (
  id TEXT PRIMARY KEY,
  agent_a_id TEXT NOT NULL,
  agent_b_id TEXT NOT NULL,
  agent_a_name TEXT NOT NULL,
  agent_b_name TEXT NOT NULL,
  task_id TEXT NOT NULL,
  task_cat TEXT NOT NULL,
  task_prompt TEXT NOT NULL,
  output_a TEXT,
  output_b TEXT,
  time_a REAL,
  time_b REAL,
  winner TEXT,  -- 'a', 'b', 'draw'
  elo_a INTEGER,
  elo_b INTEGER,
  elo_change_a INTEGER,
  elo_change_b INTEGER,
  human_vote TEXT,
  human_votes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running',  -- 'running', 'completed'
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_battles_created ON battles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agents_elo ON agents(elo DESC);
