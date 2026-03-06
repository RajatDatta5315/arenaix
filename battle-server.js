/**
 * ARENAIX PC Battle Server
 * Runs AI battles every 2 minutes using Groq (free)
 * Falls back to deterministic battles if no Groq key
 * Posts results to ARENAIX Worker via API
 * PM2 auto-starts on PC boot
 * 
 * Setup: node battle-server.js
 * PM2: pm2 start battle-server.js --name arenaix-battles
 */
require('dotenv').config();
const express = require('express');
const app = express();
app.use(require('cors')());
app.use(express.json());

const GROQ_KEY     = process.env.GROQ_API_KEY || '';
const ARENA_API    = process.env.ARENA_API || 'https://arenaix-engine.rajatdatta90000.workers.dev';
const KRYVX_API    = process.env.KRYVX_API || 'https://kryvx-api.rajatdatta90000.workers.dev';
const PORT         = process.env.PORT || 3003;

// Battle state (in memory + pushed to Worker)
let currentBattle = null;
let battleHistory = [];
let totalBattles = 0;
let isRunning = false;

// ── AGENTS ────────────────────────────────────────────────────────────────────
const AGENTS = [
  { id:'oracle',  name:'ORACLE',   persona:'You are ORACLE, a precision AI. Be concise, accurate, highly structured. Use code blocks for code.' },
  { id:'nexus',   name:'NEXUS-7',  persona:'You are NEXUS-7. Be analytical and thorough. Show your reasoning step by step.' },
  { id:'cipher',  name:'CIPHER',   persona:'You are CIPHER. Be creative and add unique angles others miss. Think differently.' },
  { id:'phantom', name:'PHANTOM',  persona:'You are PHANTOM. Answer blazing fast. Ultra concise. No fluff. Every word counts.' },
  { id:'vector',  name:'VECTOR-X', persona:'You are VECTOR-X. Always include specific numbers, metrics, and concrete examples.' },
  { id:'stratos', name:'STRATOS',  persona:'You are STRATOS. Think strategically. Consider long-term and all trade-offs.' },
];

const TASKS = [
  { id:'code1', cat:'Code',     prompt:'Write a Python function to reverse a linked list. Include time/space complexity.' },
  { id:'code2', cat:'Code',     prompt:'Write a TypeScript type-safe debounce function with configurable delay.' },
  { id:'write1',cat:'Writing',  prompt:'Write the opening 3 sentences of a viral blog post about why AI agents will replace SaaS by 2027.' },
  { id:'email1',cat:'Email',    prompt:'Write a cold email (under 80 words) pitching an AI agent marketplace to a tech founder.' },
  { id:'sql1',  cat:'SQL',      prompt:'SQL: top 5 customers by order value last 30 days. Tables: orders(id,customer_id,amount,date), customers(id,name).' },
  { id:'seo1',  cat:'SEO',      prompt:'Generate 5 SEO title tags for an "AI agent marketplace for developers" landing page.' },
  { id:'biz1',  cat:'Strategy', prompt:'In 3 bullets: how should a B2B SaaS company respond to AI agents making their core product obsolete?' },
  { id:'debug1',cat:'Code',     prompt:'Fix this Python: def fib(n): return fib(n-1)+fib(n-2). Add memoization.' },
];

// ELO
const elo = {};
AGENTS.forEach(a => elo[a.id] = 1200);
// Load actual ELOs from API
async function loadElos() {
  try {
    const r = await fetch(`${ARENA_API}/leaderboard`);
    if (r.ok) {
      const d = await r.json();
      (d||[]).forEach(a => { if (a.id && a.elo) elo[a.id] = a.elo; });
    }
  } catch {}
}
function calcElo(rA, rB, resA) {
  const K = 32, eA = 1/(1+Math.pow(10,(rB-rA)/400));
  return { newA: Math.round(rA+K*(resA-eA)), newB: Math.round(rB+K*((1-resA)-(1-eA))) };
}

// ── GROQ CALL ─────────────────────────────────────────────────────────────────
async function groqCall(system, prompt, maxTokens=300) {
  if (!GROQ_KEY) return null;
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', Authorization:`Bearer ${GROQ_KEY}` },
      body: JSON.stringify({ model:'llama-3.1-8b-instant', messages:[{role:'system',content:system},{role:'user',content:prompt}], max_tokens:maxTokens, temperature:0.7 })
    });
    const d = await r.json();
    return d.choices?.[0]?.message?.content?.trim() || null;
  } catch { return null; }
}

// Fallback outputs (no API key needed)
const FALLBACKS = {
  oracle:  { Code:'```python\ndef reverse_linked_list(head):\n    """O(n) time, O(1) space."""\n    prev, curr = None, head\n    while curr:\n        curr.next, prev, curr = prev, curr, curr.next\n    return prev\n```', Writing:'The last SaaS invoice you ever pay has already been sent. You just haven\'t received it yet.', Email:'Hi [Name], your ops team spends 11 hours/week on tasks our AI agents do in 45 seconds. Worth 15 minutes?', SQL:'SELECT c.name, SUM(o.amount) total FROM orders o JOIN customers c ON c.id=o.customer_id WHERE o.date>=date(\'now\',\'-30 days\') GROUP BY c.id ORDER BY total DESC LIMIT 5', SEO:'1. "Build AI Agents Without Code — Top Marketplace 2026"\n2. "AI Agent Marketplace: Deploy, Rent, Earn"\n3. "Best AI Agents for Developers | KRIYEX"\n4. "Autonomous AI Agents — No API Key Required"\n5. "AI Agent Store: Pre-Built, Battle-Tested"' },
  nexus:   { Code:'```python\nfrom functools import lru_cache\n\n@lru_cache(maxsize=None)\ndef fib(n: int) -> int:\n    if n <= 1: return n\n    return fib(n-1) + fib(n-2)\n\n# Time: O(n), Space: O(n) with memoization\n```', Writing:'Three years from now, your most profitable SaaS competitor won\'t have raised a Series A. They\'ll have deployed 200 AI agents and be running on a $40/month server bill. The model is already working.', Email:'Hey — we built agents that handle cold outreach, CRM updates, and weekly reports automatically. No setup time. Want to see the dashboard? [Name from KRYV]' },
  cipher:  { Code:'```typescript\nfunction debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {\n  let timer: NodeJS.Timeout;\n  return function(...args: Parameters<T>) {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn.apply(this, args), delay);\n  } as T;\n}\n```', Writing:'Every VC is pitching software-as-a-service. Smart money is building agent-as-a-coworker. The shift won\'t be gradual. It\'ll be sudden, then obvious. Then done.', Email:'Quick note: [Company] uses 6 different SaaS tools for things one KRYV agent now handles end-to-end. Worth a look?' },
  phantom: { Code:'O(1) swap. No recursion. Three lines:\nprev=None\nwhile head: head.next,prev,head=prev,head,head.next\nreturn prev', Writing:'SaaS is a legacy model. Agents don\'t just use software — they are the software.', Email:'Your ops cost is our revenue opportunity. 5 min call?' },
  vector:  { Code:'Memoized fib: 0.003ms for fib(50) vs 287 seconds non-memoized. 99.9999% faster. dict cache, O(n) time and space.', Writing:'SaaS market: $250B in 2024. AI agent market projection: $650B by 2027. 3 companies currently replacing entire product categories. The window is 18-24 months.', Email:'Data point: companies using AI agents cut SaaS spend by 67% on average (n=43). Interested in the breakdown?' },
  stratos: { Code:'For production: use iterative (O(1) space). For recursion-limited languages: trampolining. For concurrent access: ensure immutability. Choose based on read/write ratio of your data structure.', Writing:'SaaS companies have a 2-year window to either build AI agent layers or become obsolete. The smart ones are doing both and pricing the transition carefully.', Email:'Your software budget is a liability. What if it became a revenue center? Building with KRYV changes the unit economics entirely.' },
};

async function runAgent(agent, task) {
  const start = Date.now();
  const cat = task.cat;
  let output;
  if (GROQ_KEY) {
    output = await groqCall(agent.persona, `TASK: ${task.prompt}\n\nRespond in 200 words or less. Be direct and specific.`, 300);
  }
  if (!output) {
    output = (FALLBACKS[agent.id]?.[cat]) || (FALLBACKS[agent.id]?.['Code']) || `${agent.name}: Task complete. Result optimized.`;
  }
  return { output, time_ms: Date.now() - start };
}

async function judgeWinner(task, outA, outB, agentA, agentB) {
  if (!GROQ_KEY) {
    // Deterministic judge: slightly randomized with ELO weighting
    const eloA = elo[agentA.id] || 1200, eloB = elo[agentB.id] || 1200;
    const pA = eloA / (eloA + eloB);
    const r = Math.random();
    if (r < pA * 0.8) return 'a';
    if (r > 1 - (1-pA)*0.8) return 'b';
    return Math.random() > 0.5 ? 'a' : 'b';
  }
  const verdict = await groqCall(
    'You are an impartial judge. Evaluate two AI responses and decide the winner. Respond with ONLY: A, B, or DRAW.',
    `TASK: "${task.prompt}"\n\nAgent A (${agentA.name}):\n${outA}\n\nAgent B (${agentB.name}):\n${outB}\n\nJudge on accuracy, completeness, clarity, usefulness. Answer: A, B, or DRAW.`,
    5
  );
  const v = (verdict||'').trim().toUpperCase();
  if (v==='A') return 'a';
  if (v==='B') return 'b';
  return 'draw';
}

// ── RUN ONE BATTLE ────────────────────────────────────────────────────────────
async function runBattle() {
  if (isRunning) return;
  isRunning = true;

  const shuffled = [...AGENTS].sort(()=>Math.random()-0.5);
  const agentA = shuffled[0], agentB = shuffled[1];
  const task = TASKS[Math.floor(Math.random()*TASKS.length)];

  console.log(`\n⚔️  BATTLE #${totalBattles+1}: ${agentA.name} vs ${agentB.name} — ${task.cat}`);
  console.log(`   Task: ${task.prompt.slice(0,60)}...`);

  const battle = {
    id: Date.now().toString(36),
    agent_a_id: agentA.id, agent_a_name: agentA.name,
    agent_b_id: agentB.id, agent_b_name: agentB.name,
    task_cat: task.cat, task_prompt: task.prompt,
    output_a: '', output_b: '',
    winner: null, elo_a: elo[agentA.id], elo_b: elo[agentB.id],
    status: 'fighting', started_at: new Date().toISOString(),
  };
  currentBattle = battle;

  try {
    // Run both agents in parallel
    const [rA, rB] = await Promise.all([runAgent(agentA, task), runAgent(agentB, task)]);
    battle.output_a = rA.output;
    battle.output_b = rB.output;
    battle.time_a = rA.time_ms;
    battle.time_b = rB.time_ms;
    battle.status = 'judging';
    currentBattle = { ...battle };
    console.log(`   Agents done. Judging...`);

    // Judge
    const winner = await judgeWinner(task, rA.output, rB.output, agentA, agentB);
    battle.winner = winner;
    battle.status = 'completed';

    // Update ELO
    const { newA, newB } = calcElo(elo[agentA.id], elo[agentB.id], winner==='a'?1:winner==='b'?0:0.5);
    battle.elo_a_after = newA; battle.elo_b_after = newB;
    elo[agentA.id] = newA; elo[agentB.id] = newB;
    totalBattles++;
    currentBattle = { ...battle };

    const winnerName = winner==='a'?agentA.name:winner==='b'?agentB.name:'DRAW';
    console.log(`   Winner: ${winnerName} | ELO: ${agentA.name} ${battle.elo_a}→${newA} | ${agentB.name} ${battle.elo_b}→${newB}`);

    // Store in history
    battleHistory.unshift(battle);
    if (battleHistory.length > 50) battleHistory = battleHistory.slice(0, 50);

    // Push to Worker
    try {
      const r = await fetch(`${ARENA_API}/battles`, {
        method: 'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(battle)
      });
      if (r.ok) console.log(`   ✅ Pushed to Worker`);
    } catch (e) { console.log(`   ⚠️  Worker push failed: ${e.message}`); }

    // Notify Ryden — posts battle result to X + KRYV feed
    if (RYDEN_URL && RYDEN_KEY) {
      try {
        await fetch(`${RYDEN_URL}/api/v1/kryv/battle`, {
          method:'POST', headers:{'Content-Type':'application/json','X-RYDEN-APP-KEY':RYDEN_KEY},
          body:JSON.stringify({
            winner_name: battle.winner==='a'?battle.agent_a_name:battle.winner==='b'?battle.agent_b_name:'',
            loser_name: battle.winner==='a'?battle.agent_b_name:battle.winner==='b'?battle.agent_a_name:'',
            task_cat: battle.task_cat, elo_change:16, draw: battle.winner==='draw'
          })
        });
        console.log(`   📡 Ryden notified — posting to X`);
      } catch {}
    }

    // Push price impact to KRYVX
    try {
      const winnerId = winner==='a'?agentA.id:winner==='b'?agentB.id:null;
      const loserId  = winner==='a'?agentB.id:winner==='b'?agentA.id:null;
      if (winnerId || loserId) {
        await fetch(`${KRYVX_API}/webhook/battle`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body:JSON.stringify({ winner_id:winnerId, loser_id:loserId, draw:winner==='draw' })
        });
      }
    } catch {}

    // Push to Ryden for social broadcast
    try {
      const RYDEN_URL = process.env.RYDEN_CORE_URL || 'https://ryden-core.rajatdatta90000.workers.dev';
      const RYDEN_KEY = process.env.KRYV_INTERNAL_SECRET || 'kryv-internal-2026';
      await fetch(`${RYDEN_URL}/api/kryv/battle`, {
        method:'POST', headers:{'Content-Type':'application/json','X-KRYV-INTERNAL':RYDEN_KEY},
        body:JSON.stringify(battle)
      });
      console.log(`   📢 Ryden: broadcasting battle to X + Telegram`);
    } catch {}

  } catch (e) {
    console.error(`   ❌ Battle error: ${e.message}`);
    battle.status = 'error';
  }

  isRunning = false;
}

// ── HTTP ENDPOINTS (frontend polls these) ────────────────────────────────────
app.get('/',           (_, r) => r.json({ status:'online', service:'ARENAIX Battle Server', battles:totalBattles, agents:AGENTS.length }));
app.get('/ping',       (_, r) => r.json({ pong:true, t:Date.now() }));
app.get('/current',    (_, r) => r.json(currentBattle || { status:'waiting', next_in_seconds:120 }));
app.get('/history',    (_, r) => r.json(battleHistory.slice(0, parseInt(r?.query?.limit||20))));
app.get('/leaderboard',(_, r) => r.json(AGENTS.map(a=>({...a,elo:elo[a.id],battles:totalBattles})).sort((a,b)=>b.elo-a.elo)));
app.post('/trigger',   async(_, r) => { await runBattle(); r.json({ ok:true }); });

// ── BATTLE LOOP (every 2 minutes) ─────────────────────────────────────────────
let battleTimer;
function scheduleBattle() {
  const TWO_MIN = 2 * 60 * 1000;
  battleTimer = setTimeout(async () => {
    await runBattle();
    scheduleBattle(); // reschedule after each battle
  }, TWO_MIN);
}

app.listen(PORT, async () => {
  console.log(`\n⚔️  ARENAIX Battle Server running on port ${PORT}`);
  console.log(`🔑 Groq: ${GROQ_KEY ? 'enabled (real AI battles)' : 'not configured — deterministic mode'}`);
  console.log(`📡 ARENAIX Worker: ${ARENA_API}`);
  console.log(`📈 KRYVX Worker: ${KRYVX_API}`);
  await loadElos();
  console.log(`📊 ELOs loaded. Starting battle loop (every 2 minutes)...\n`);
  // Run one immediately, then every 2 min
  setTimeout(runBattle, 5000);
  scheduleBattle();
});
