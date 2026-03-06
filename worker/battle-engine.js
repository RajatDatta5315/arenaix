/**
 * ARENAIX Autonomous Battle Engine
 * Cloudflare Worker — runs battles every 2 minutes via cron
 * Stores results in D1, frontend polls for live updates
 * Deploy: npx wrangler deploy --config worker/wrangler.toml
 */

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

// ── AGENT ROSTER ─────────────────────────────────────────────────────────────
const SYSTEM_AGENTS = [
  { id: 'oracle',    name: 'ORACLE',    model: 'gpt-4o-mini',    persona: 'You are ORACLE, a precision AI. Be concise, accurate, structured. Use code blocks when coding.', elo: 1923, wins: 203, losses: 41 },
  { id: 'nexus',     name: 'NEXUS-7',   model: 'gpt-4o-mini',    persona: 'You are NEXUS-7, an analytical AI. Be thorough, show reasoning step by step.', elo: 1847, wins: 142, losses: 38 },
  { id: 'cipher',    name: 'CIPHER',    model: 'gpt-4o-mini',    persona: 'You are CIPHER, a creative AI. Add unique angles and perspectives others miss.', elo: 1792, wins: 118, losses: 33 },
  { id: 'phantom',   name: 'PHANTOM',   model: 'gpt-4o-mini',    persona: 'You are PHANTOM, a speed AI. Give blazing fast, ultra concise answers. No fluff.', elo: 1654, wins: 94,  losses: 44 },
  { id: 'vector',    name: 'VECTOR-X',  model: 'gpt-4o-mini',    persona: 'You are VECTOR-X, a data AI. Always include numbers, metrics, and examples.', elo: 1521, wins: 67,  losses: 51 },
  { id: 'stratos',   name: 'STRATOS',   model: 'gpt-4o-mini',    persona: 'You are STRATOS, a strategic AI. Think long-term, consider all trade-offs.', elo: 1489, wins: 55,  losses: 48 },
];

const TASKS = [
  { id: 'code1',    cat: 'Code',     prompt: 'Write a Python function to check if a string is a palindrome. Include edge cases and docstring.' },
  { id: 'write1',   cat: 'Writing',  prompt: 'Write a 3-sentence hook for a blog post titled: "Why AI Agents Will Replace Traditional SaaS by 2027"' },
  { id: 'email1',   cat: 'Email',    prompt: 'Write a cold email (under 100 words) pitching an AI agent marketplace to a startup founder.' },
  { id: 'seo1',     cat: 'SEO',      prompt: 'Generate 5 SEO-optimized title tags for a landing page about "AI agent marketplace for developers".' },
  { id: 'sql1',     cat: 'SQL',      prompt: 'Write a SQL query: top 5 customers by total order value in the last 30 days. Tables: orders(id,customer_id,amount,date), customers(id,name).' },
  { id: 'research1',cat: 'Research', prompt: 'In 3 bullet points: key differences between RAG and fine-tuning for production AI. Be specific.' },
  { id: 'code2',    cat: 'Code',     prompt: 'Write a TypeScript function that debounces any async function with a configurable delay.' },
  { id: 'write2',   cat: 'Writing',  prompt: 'Write an engaging Twitter/X thread opener (first tweet) about the future of autonomous AI agents.' },
];

// ── ELO CALCULATION ────────────────────────────────────────────────────────
function calcElo(ratingA, ratingB, resultA) {
  const K = 32;
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const newA = Math.round(ratingA + K * (resultA - expectedA));
  const newB = Math.round(ratingB + K * ((1 - resultA) - (1 - expectedA)));
  return { newA, newB };
}

// ── AUTO-JUDGE (ask GPT to pick winner) ────────────────────────────────────
async function judgeOutputs(task, outputA, outputB, agentA, agentB, env) {
  const judgePrompt = `You are judging a battle between two AI agents on this task:
TASK: "${task.prompt}"

AGENT A (${agentA.name}) output:
${outputA}

AGENT B (${agentB.name}) output:
${outputB}

Judge based on: accuracy, completeness, clarity, usefulness.
Respond with ONLY one word: A or B or DRAW`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: judgePrompt }],
      max_tokens: 5,
      temperature: 0,
    }),
  });
  const data = await res.json();
  const verdict = data.choices?.[0]?.message?.content?.trim().toUpperCase() || 'DRAW';
  if (verdict === 'A') return 'a';
  if (verdict === 'B') return 'b';
  return 'draw';
}

// ── RUN ONE AGENT ─────────────────────────────────────────────────────────
async function runAgent(agent, task, env) {
  const start = Date.now();
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: agent.model,
      messages: [
        { role: 'system', content: agent.persona },
        { role: 'user', content: task.prompt },
      ],
      max_tokens: 400,
    }),
  });
  const data = await res.json();
  const output = data.choices?.[0]?.message?.content || 'No output generated.';
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  return { output, elapsed: parseFloat(elapsed) };
}

// ── EXECUTE A BATTLE ──────────────────────────────────────────────────────
async function executeBattle(agentA, agentB, task, env) {
  const battleId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Insert pending battle record
  await env.DB.prepare(`INSERT INTO battles (id, agent_a_id, agent_b_id, agent_a_name, agent_b_name, task_id, task_cat, task_prompt, status, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .bind(battleId, agentA.id, agentB.id, agentA.name, agentB.name, task.id, task.cat, task.prompt, 'running', now).run();

  // Run both agents in parallel
  const [resA, resB] = await Promise.all([
    runAgent(agentA, task, env),
    runAgent(agentB, task, env),
  ]);

  // Judge who won
  const winner = await judgeOutputs(task, resA.output, resB.output, agentA, agentB, env);

  // Update ELO
  const resultA = winner === 'a' ? 1 : winner === 'draw' ? 0.5 : 0;
  const { newA, newB } = calcElo(agentA.elo, agentB.elo, resultA);
  const eloChangeA = newA - agentA.elo;
  const eloChangeB = newB - agentB.elo;

  // Update battle record
  await env.DB.prepare(`UPDATE battles SET output_a=?, output_b=?, time_a=?, time_b=?, winner=?, elo_a=?, elo_b=?, elo_change_a=?, elo_change_b=?, status='completed', completed_at=? WHERE id=?`)
    .bind(resA.output, resB.output, resA.elapsed, resB.elapsed, winner, newA, newB, eloChangeA, eloChangeB, new Date().toISOString(), battleId).run();

  // Update agent ELO in leaderboard table
  const winsA = winner === 'a' ? agentA.wins + 1 : agentA.wins;
  const lossA = winner === 'b' ? agentA.losses + 1 : agentA.losses;
  const winsB = winner === 'b' ? agentB.wins + 1 : agentB.wins;
  const lossB = winner === 'a' ? agentB.losses + 1 : agentB.losses;

  await env.DB.prepare(`INSERT INTO agents (id,name,model,elo,wins,losses,kryv_score,color) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET elo=excluded.elo, wins=excluded.wins, losses=excluded.losses, kryv_score=excluded.kryv_score`)
    .bind(agentA.id, agentA.name, agentA.model, newA, winsA, lossA, newA * winsA, agentA.color || 'violet').run();
  await env.DB.prepare(`INSERT INTO agents (id,name,model,elo,wins,losses,kryv_score,color) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET elo=excluded.elo, wins=excluded.wins, losses=excluded.losses, kryv_score=excluded.kryv_score`)
    .bind(agentB.id, agentB.name, agentB.model, newB, winsB, lossB, newB * winsB, agentB.color || 'cyan').run();

  return { battleId, winner, eloChangeA, eloChangeB };
}

// ── CRON: runs every 2 minutes ─────────────────────────────────────────────
async function runAutoBattle(env) {
  // Seed agents if not exist
  for (const a of SYSTEM_AGENTS) {
    await env.DB.prepare(`INSERT OR IGNORE INTO agents (id,name,model,elo,wins,losses,kryv_score,color) VALUES (?,?,?,?,?,?,?,?)`)
      .bind(a.id, a.name, a.model, a.elo, a.wins, a.losses, a.elo * a.wins, ['violet','cyan','green','gold'][Math.floor(Math.random()*4)]).run();
  }

  // Get current ELOs from DB
  const { results: dbAgents } = await env.DB.prepare('SELECT * FROM agents ORDER BY elo DESC').all();
  const agentPool = dbAgents.length >= 2 ? dbAgents : SYSTEM_AGENTS;

  // Pick 2 different random agents
  const shuffled = [...agentPool].sort(() => Math.random() - 0.5);
  const agentA = { ...shuffled[0], persona: SYSTEM_AGENTS.find(a => a.id === shuffled[0].id)?.persona || 'You are a helpful AI assistant.' };
  const agentB = { ...shuffled[1], persona: SYSTEM_AGENTS.find(a => a.id === shuffled[1].id)?.persona || 'You are a helpful AI assistant.' };
  const task = TASKS[Math.floor(Math.random() * TASKS.length)];

  await executeBattle(agentA, agentB, task, env);
  console.log(`Auto battle complete: ${agentA.name} vs ${agentB.name} on ${task.cat}`);
}

// ── HTTP HANDLERS ──────────────────────────────────────────────────────────
export default {
  // Cron trigger
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runAutoBattle(env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    // GET /battles — latest 20 battles for live feed
    if (path === '/battles' && request.method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const { results } = await env.DB.prepare('SELECT * FROM battles WHERE status=? ORDER BY created_at DESC LIMIT ?')
        .bind('completed', limit).all();
      return json(results);
    }

    // GET /battles/live — most recent running battle
    if (path === '/battles/live') {
      const battle = await env.DB.prepare('SELECT * FROM battles ORDER BY created_at DESC LIMIT 1').first();
      return json(battle);
    }

    // GET /leaderboard
    if (path === '/leaderboard') {
      const { results } = await env.DB.prepare('SELECT * FROM agents ORDER BY elo DESC').all();
      return json(results);
    }

    // POST /battles/vote — human votes on a battle
    if (path === '/battles/vote' && request.method === 'POST') {
      const { battleId, vote } = await request.json();
      await env.DB.prepare('UPDATE battles SET human_vote=?, human_votes=COALESCE(human_votes,0)+1 WHERE id=?')
        .bind(vote, battleId).run();
      return json({ ok: true });
    }

    // POST /battles/submit-agent — external agent submission
    if (path === '/agents/submit' && request.method === 'POST') {
      const { name, model, persona, owner_email, kriyex_url } = await request.json();
      if (!name || !model) return json({ error: 'name and model required' }, 400);
      const id = crypto.randomUUID().slice(0, 8);
      await env.DB.prepare(`INSERT OR REPLACE INTO agents (id,name,model,elo,wins,losses,kryv_score,color,owner_email,kriyex_url) VALUES (?,?,?,1400,0,0,0,'violet',?,?)`)
        .bind(id, name, model, owner_email || '', kriyex_url || '').run();
      return json({ id, name, message: `Agent ${name} entered the arena! Starting ELO: 1400` }, 201);
    }

    // Trigger manual battle (for testing)
    if (path === '/battles/trigger' && request.method === 'POST') {
      await runAutoBattle(env);
      return json({ ok: true, message: 'Battle triggered' });
    }


    // POST /battles — PC server pushes a completed battle result
    if (path === '/battles' && request.method === 'POST') {
      const b = await request.json();
      const id = b.id || crypto.randomUUID().slice(0,12);
      try {
        await env.DB.prepare(`INSERT OR REPLACE INTO battles
          (id,agent_a_id,agent_a_name,agent_b_id,agent_b_name,task_cat,task_prompt,output_a,output_b,winner,elo_a,elo_b,status,created_at)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,'completed',CURRENT_TIMESTAMP)`)
          .bind(id,b.agent_a_id,b.agent_a_name,b.agent_b_id,b.agent_b_name,b.task_cat||'General',b.task_prompt||'',b.output_a||'',b.output_b||'',b.winner||'draw',b.elo_a_after||b.elo_a||1200,b.elo_b_after||b.elo_b||1200).run();
        if(b.winner!=='draw'){
          if(b.winner==='a') await env.DB.prepare('UPDATE agents SET elo=?,wins=wins+1 WHERE id=?').bind(b.elo_a_after||b.elo_a,b.agent_a_id).run();
          if(b.winner==='b') await env.DB.prepare('UPDATE agents SET elo=?,wins=wins+1 WHERE id=?').bind(b.elo_b_after||b.elo_b,b.agent_b_id).run();
        }
        return json({ ok: true, battle_id: id });
      } catch(e) { return json({ error: e.message }, 500); }
    }

    return json({ error: 'Not found' }, 404);
  }
};

