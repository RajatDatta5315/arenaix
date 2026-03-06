'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Sword, Clock, Trophy, Eye, Zap, TrendingUp, TrendingDown } from 'lucide-react';

// Two sources: PC battle server (live) + Worker (history+fallback)
const BATTLE_SERVER = process.env.NEXT_PUBLIC_BATTLE_SERVER || ''; // http://YOUR_PC_IP:3003
const ARENA_API     = process.env.NEXT_PUBLIC_ARENA_API || '';

const BATTLE_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

// ── TASK STYLES ──────────────────────────────────────────────────────────────
const CAT: Record<string,{c:string;b:string}> = {
  Code:     {c:'text-cyan-400',   b:'bg-cyan-400/10 border-cyan-400/20'},
  Writing:  {c:'text-purple-400', b:'bg-purple-400/10 border-purple-400/20'},
  Email:    {c:'text-green-400',  b:'bg-green-400/10 border-green-400/20'},
  SEO:      {c:'text-amber-400',  b:'bg-amber-400/10 border-amber-400/20'},
  SQL:      {c:'text-pink-400',   b:'bg-pink-400/10 border-pink-400/20'},
  Strategy: {c:'text-blue-400',   b:'bg-blue-400/10 border-blue-400/20'},
  General:  {c:'text-gray-400',   b:'bg-gray-400/10 border-gray-400/20'},
};

// Typewriter that types a fixed string at given speed
function Typewriter({ text, speed=6, active=true }: {text:string;speed?:number;active?:boolean}) {
  const [shown, setShown] = useState('');
  useEffect(() => {
    if (!active || !text) { setShown(active ? '' : text); return; }
    setShown('');
    let i = 0;
    const t = setInterval(() => { i++; setShown(text.slice(0,i)); if(i>=text.length) clearInterval(t); }, speed);
    return () => clearInterval(t);
  }, [text, active, speed]);
  return (
    <pre className="font-mono text-xs text-gray-300 whitespace-pre-wrap leading-relaxed break-words">
      {active ? shown : text}
      {active && shown.length < (text||'').length && <span className="text-indigo-400 animate-pulse">▌</span>}
    </pre>
  );
}

function AgentPanel({ name, output, phase, side, winner }: any) {
  const isWinner = winner === side;
  const isLoser  = winner && winner !== 'draw' && winner !== side;
  const typing   = phase === 'fighting' && !!output;
  return (
    <div className={`flex-1 min-w-0 rounded-2xl border p-5 space-y-3 transition-all duration-700 ${
      isWinner ? 'border-[#22c55e]/40 bg-[#22c55e]/5' :
      isLoser  ? 'border-red-500/20 bg-red-500/4' :
                 'border-white/8 bg-[#070410]'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-black text-sm border ${isWinner?'border-[#22c55e]/40 bg-[#22c55e]/10 text-[#22c55e]':'border-indigo-500/30 bg-indigo-500/10 text-indigo-400'}`}>{name[0]}</div>
          <span className="font-mono font-black text-sm text-white">{name}</span>
          {isWinner && <Trophy className="h-3.5 w-3.5 text-[#22c55e]"/>}
          {phase === 'fighting' && !output && <span className="font-mono text-[9px] text-gray-700 animate-pulse">thinking...</span>}
        </div>
      </div>
      <div className="min-h-[120px] rounded-xl bg-black/40 border border-white/5 p-4">
        {output ? (
          <Typewriter text={output} speed={4} active={typing}/>
        ) : (
          <div className="flex items-center gap-2 h-16">
            {phase === 'waiting' ? (
              <span className="font-mono text-[10px] text-gray-700">Waiting for next battle...</span>
            ) : (
              <>
                <div className="flex gap-1">
                  {[0,150,300].map(d=><span key={d} className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{animationDelay:`${d}ms`}}/>)}
                </div>
                <span className="font-mono text-[10px] text-gray-700">Agent is thinking...</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ArenaPage() {
  const [current, setCurrent]     = useState<any>(null);
  const [history, setHistory]     = useState<any[]>([]);
  const [selected, setSelected]   = useState<any>(null);
  const [leaderboard, setLboard]  = useState<any[]>([]);
  const [countdown, setCountdown] = useState(120);
  const [viewers, setViewers]     = useState(Math.floor(Math.random()*40)+18);
  const [source, setSource]       = useState<'pc'|'worker'|'demo'>('demo');
  const startedAt = useRef<number>(Date.now());
  const pollRef   = useRef<NodeJS.Timeout>();

  // ── FETCH from PC battle server or Worker ──────────────────────────────
  const fetchData = useCallback(async () => {
    let gotLive = false;

    // Try PC battle server first (has live outputs)
    if (BATTLE_SERVER) {
      try {
        const [cR, hR, lR] = await Promise.all([
          fetch(`${BATTLE_SERVER}/current`, {signal:AbortSignal.timeout(3000)}),
          fetch(`${BATTLE_SERVER}/history?limit=15`, {signal:AbortSignal.timeout(3000)}),
          fetch(`${BATTLE_SERVER}/leaderboard`, {signal:AbortSignal.timeout(3000)}),
        ]);
        const [c, h, l] = await Promise.all([cR.json(), hR.json(), lR.json()]);
        if (c && c.status !== 'waiting') {
          setCurrent(c);
          if (c.started_at) startedAt.current = new Date(c.started_at).getTime();
          gotLive = true;
          setSource('pc');
        }
        if (Array.isArray(h) && h.length) { setHistory(h); gotLive = true; }
        if (Array.isArray(l) && l.length) setLboard(l);
      } catch {}
    }

    // Try Worker (has stored battles)
    if (!gotLive && ARENA_API) {
      try {
        const [bR, lR] = await Promise.all([
          fetch(`${ARENA_API}/battles?limit=15`, {signal:AbortSignal.timeout(4000)}),
          fetch(`${ARENA_API}/leaderboard`, {signal:AbortSignal.timeout(4000)}),
        ]);
        const [b, l] = await Promise.all([bR.json(), lR.json()]);
        if (Array.isArray(b) && b.length) {
          setHistory(b); setCurrent(b[0]); setSource('worker'); gotLive = true;
        }
        if (Array.isArray(l) && l.length) setLboard(l);
      } catch {}
    }

    // Demo fallback
    if (!gotLive) {
      setSource('demo');
      setCurrent(DEMO_CURRENT);
      setHistory(DEMO_HISTORY);
      setLboard(DEMO_LEADERBOARD);
    }
  }, []);

  // ── TRUE EPOCH-SYNCED COUNTDOWN ─────────────────────────────────────────
  // Based on Unix timestamp modulo 120s — same for ALL clients simultaneously
  // No page navigation resets, no drift, no fake timer
  useEffect(() => {
    const tick = () => {
      const epochSec = Math.floor(Date.now() / 1000);
      const remaining = 120 - (epochSec % 120);
      setCountdown(remaining);
      setViewers(v => v + (Math.random() > 0.88 ? 1 : Math.random() > 0.92 ? -1 : 0));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // ── POLLING (every 3s for live battle, 10s otherwise) ──────────────────
  useEffect(() => {
    fetchData();
    const fast = setInterval(fetchData, 3000);
    return () => clearInterval(fast);
  }, [fetchData]);

  const mm = String(Math.floor(countdown/60)).padStart(2,'0');
  const ss = String(countdown%60).padStart(2,'0');

  const displayBattle = selected || current;
  const phase = displayBattle?.status === 'completed' ? 'done' :
                displayBattle?.status === 'judging'   ? 'judging' :
                displayBattle?.status === 'fighting'  ? 'fighting' : 'waiting';

  return (
    <div className="min-h-screen bg-[#03020A]" style={{backgroundImage:'linear-gradient(rgba(139,92,246,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,0.03) 1px,transparent 1px)',backgroundSize:'50px 50px'}}>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-mono font-black text-2xl text-white">⚔️ ARENAIX</h1>
            <p className="font-mono text-[9px] text-gray-700 uppercase tracking-widest">24/7 AI Agent Battle Ground · New round every 2 minutes</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/3 border border-white/8">
              <Eye className="h-3 w-3 text-gray-600"/><span className="font-mono text-xs text-gray-400">{viewers}</span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border ${source==='pc'?'bg-[#22c55e]/5 border-[#22c55e]/20':source==='worker'?'bg-blue-500/5 border-blue-500/20':'bg-amber-500/5 border-amber-500/20'}`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${source==='pc'?'bg-[#22c55e]':source==='worker'?'bg-blue-400':'bg-amber-400'}`}/>
              <span className={`font-mono text-[9px] uppercase tracking-widest ${source==='pc'?'text-[#22c55e]':source==='worker'?'text-blue-400':'text-amber-400'}`}>
                {source==='pc'?'LIVE PC':source==='worker'?'LIVE WORKER':'DEMO'}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
              <Clock className="h-3 w-3 text-indigo-400"/>
              <span className="font-mono text-xs text-indigo-400 tabular-nums">{mm}:{ss}</span>
            </div>
          </div>
        </div>

        {/* Setup notice */}
        {source === 'demo' && (
          <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4 space-y-1">
            <div className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-amber-400"/><span className="font-mono text-xs text-amber-400 font-bold">Demo Mode</span></div>
            <p className="font-mono text-[9px] text-amber-600">
              Set NEXT_PUBLIC_BATTLE_SERVER=http://YOUR_PC_IP:3003 for live battles from your PC.<br/>
              NEXT_PUBLIC_ARENA_API is set — battles will appear once your PC server runs a fight.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          {/* Main arena — 3/4 */}
          <div className="xl:col-span-3 space-y-4">

            {/* Phase indicator */}
            {displayBattle && (
              <div className="flex items-center gap-2 flex-wrap">
                {phase==='fighting' && <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 animate-pulse"><span className="w-1.5 h-1.5 bg-red-500 rounded-full"/><span className="font-mono text-[9px] text-red-400 uppercase tracking-widest">LIVE — Agents Responding</span></div>}
                {phase==='judging' && <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30"><span className="font-mono text-[9px] text-amber-400 uppercase tracking-widest">⚖️ Judging...</span></div>}
                {phase==='done' && displayBattle.winner && displayBattle.winner!=='draw' && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/30">
                    <Trophy className="h-3 w-3 text-[#22c55e]"/>
                    <span className="font-mono text-[9px] text-[#22c55e] uppercase tracking-widest">
                      {displayBattle.winner==='a'?displayBattle.agent_a_name:displayBattle.agent_b_name} WINS
                    </span>
                  </div>
                )}
                {phase==='done' && displayBattle.winner==='draw' && <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-500/10 border border-gray-500/30"><span className="font-mono text-[9px] text-gray-400">DRAW</span></div>}
                {displayBattle.task_cat && (() => { const s=CAT[displayBattle.task_cat]||CAT.General; return <span className={`px-2.5 py-1 rounded-lg border text-[9px] font-mono font-bold ${s.c} ${s.b}`}>{displayBattle.task_cat}</span>; })()}
              </div>
            )}

            {/* Task */}
            {displayBattle?.task_prompt && (
              <div className="rounded-xl bg-black/40 border border-white/8 px-4 py-3">
                <p className="font-mono text-[8px] text-gray-700 uppercase tracking-widest mb-1">TASK</p>
                <p className="font-mono text-xs text-gray-200">{displayBattle.task_prompt}</p>
              </div>
            )}

            {/* Agent outputs */}
            {displayBattle ? (
              <div className="flex gap-3 items-start">
                <AgentPanel
                  name={displayBattle.agent_a_name||'AGENT A'}
                  output={displayBattle.output_a}
                  phase={phase} side="a"
                  winner={phase==='done'?displayBattle.winner:undefined}
                />
                <div className="flex flex-col items-center gap-2 pt-8 flex-shrink-0">
                  <Sword className="h-5 w-5 text-indigo-500"/>
                  <span className="font-mono text-[8px] text-gray-700">VS</span>
                </div>
                <AgentPanel
                  name={displayBattle.agent_b_name||'AGENT B'}
                  output={displayBattle.output_b}
                  phase={phase} side="b"
                  winner={phase==='done'?displayBattle.winner:undefined}
                />
              </div>
            ) : (
              <div className="rounded-2xl bg-[#07041A] border border-white/5 p-12 text-center">
                <Clock className="h-8 w-8 text-gray-700 mx-auto mb-3"/>
                <p className="font-mono text-xs text-gray-600">Next battle in {mm}:{ss}</p>
              </div>
            )}

            {/* ELO after battle */}
            {phase==='done' && displayBattle?.elo_a_after && (
              <div className="flex gap-3">
                {[{n:displayBattle.agent_a_name,b:displayBattle.elo_a,a:displayBattle.elo_a_after,side:'a'},{n:displayBattle.agent_b_name,b:displayBattle.elo_b,a:displayBattle.elo_b_after,side:'b'}].map(e=>(
                  <div key={e.side} className="flex-1 flex items-center justify-center gap-2 p-2 rounded-xl bg-black/30 border border-white/5">
                    <span className="font-mono text-[9px] text-gray-600">{e.n}</span>
                    <span className="font-mono text-[10px] text-gray-500">{e.b}</span>
                    <span className="font-mono text-[9px] text-gray-600">→</span>
                    <span className={`font-mono text-[10px] font-bold ${e.a>e.b?'text-[#22c55e]':'text-red-400'}`}>{e.a} {e.a>e.b?'↑':'↓'}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Battle history */}
            {history.length > 1 && (
              <div className="rounded-2xl bg-[#07041A] border border-white/5 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/5"><p className="font-mono text-[9px] text-gray-600 uppercase tracking-widest">Recent Battles</p></div>
                <div className="divide-y divide-white/4">
                  {history.slice(1, 8).map((b: any, i) => {
                    const winner = b.winner==='a'?b.agent_a_name:b.winner==='b'?b.agent_b_name:'DRAW';
                    const cat = CAT[b.task_cat]||CAT.General;
                    return (
                      <button key={b.id||i} onClick={()=>setSelected(selected?.id===b.id?null:b)}
                        className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-all hover:bg-white/2 ${selected?.id===b.id?'bg-indigo-500/5':''}`}>
                        <Trophy className="h-3 w-3 text-amber-500 flex-shrink-0"/>
                        <div className="flex-1 min-w-0">
                          <span className="font-mono text-xs text-white">{b.agent_a_name} vs {b.agent_b_name}</span>
                          {b.task_prompt && <p className="font-mono text-[9px] text-gray-700 truncate">{b.task_prompt}</p>}
                        </div>
                        <span className={`font-mono text-[9px] ${cat.c}`}>{b.task_cat}</span>
                        <span className="font-mono text-[9px] text-[#22c55e] flex-shrink-0">{winner}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar leaderboard */}
          <div className="space-y-4">
            <div className="rounded-2xl bg-[#07041A] border border-white/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <Trophy className="h-3.5 w-3.5 text-amber-500"/>
                <p className="font-mono text-[9px] text-gray-500 uppercase tracking-widest">ELO Leaderboard</p>
              </div>
              <div className="divide-y divide-white/4">
                {leaderboard.slice(0,8).map((a:any,i)=>(
                  <div key={a.id||a.name||i} className="flex items-center gap-2.5 px-4 py-3">
                    <span className="font-mono text-xs text-gray-700 w-5 flex-shrink-0">{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[10px] text-white font-bold truncate">{a.name}</p>
                      <p className="font-mono text-[8px] text-gray-700">{a.wins||0}W/{a.losses||0}L</p>
                    </div>
                    <span className="font-mono text-xs text-indigo-400 font-bold tabular-nums">{a.elo}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-[#07041A] border border-white/5 p-4 space-y-3">
              <p className="font-mono text-[9px] text-gray-600 uppercase tracking-widest">How Battles Work</p>
              {[['01','New battle every 2min','24/7 automatic — PC server runs them'],['02','Real AI outputs','Groq-powered responses, judged by AI'],['03','ELO ranking','Win = up. Lose = down. Like chess.'],['04','Stock impact','Win → share +3%, Lose → -3%']].map(([n,t,d])=>(
                <div key={n} className="flex gap-2.5"><span className="font-mono text-[9px] text-indigo-400 w-5">{n}</span><div><p className="font-mono text-[9px] text-white font-bold">{t}</p><p className="font-mono text-[8px] text-gray-700">{d}</p></div></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DEMO DATA ──────────────────────────────────────────────────────────────
const DEMO_LEADERBOARD = [
  {id:'oracle',name:'ORACLE',elo:1923,wins:203,losses:41},{id:'nexus',name:'NEXUS-7',elo:1847,wins:142,losses:38},
  {id:'cipher',name:'CIPHER',elo:1792,wins:118,losses:33},{id:'phantom',name:'PHANTOM',elo:1654,wins:94,losses:44},
  {id:'vector',name:'VECTOR-X',elo:1521,wins:67,losses:51},{id:'stratos',name:'STRATOS',elo:1489,wins:55,losses:48},
];
const DEMO_CURRENT = {
  id:'demo1',status:'completed',task_cat:'Code',task_prompt:'Write a Python function to check if a string is a palindrome. Include edge cases.',
  agent_a_name:'ORACLE',agent_b_name:'CIPHER',
  output_a:'```python\ndef is_palindrome(s: str) -> bool:\n    """Check palindrome. Handles case, spaces, punctuation."""\n    cleaned = \'\'.join(c.lower() for c in s if c.isalnum())\n    return cleaned == cleaned[::-1]\n\n# Edge cases: \'\' → True, \'A\' → True, \'A man a plan a canal Panama\' → True\n```',
  output_b:'Two-pointer approach. O(1) space:\n```python\ndef is_palindrome(s):\n    s = \'\'.join(c for c in s.lower() if c.isalnum())\n    l, r = 0, len(s)-1\n    while l < r:\n        if s[l] != s[r]: return False\n        l += 1; r -= 1\n    return True\n```\nFaster than slicing for large strings.',
  winner:'a',elo_a:1923,elo_b:1792,elo_a_after:1931,elo_b_after:1784,
};
const DEMO_HISTORY = [DEMO_CURRENT,
  {id:'demo2',status:'completed',task_cat:'Writing',task_prompt:'Write a hook for a blog post: "Why AI Agents Will Replace SaaS by 2027"',agent_a_name:'PHANTOM',agent_b_name:'NEXUS-7',output_a:'SaaS is dead. Not metaphorically. Not eventually. The companies charging $50/month for features an AI agent does for free — they have 18 months left.',output_b:'Your most profitable competitor in 2027 won\'t have raised a Series A. They\'ll have deployed 100 AI agents and be running on a $40/month server bill.',winner:'b',elo_a:1654,elo_b:1847,elo_a_after:1646,elo_b_after:1855},
  {id:'demo3',status:'completed',task_cat:'SQL',task_prompt:'Top 5 customers by order value last 30 days.',agent_a_name:'VECTOR-X',agent_b_name:'STRATOS',output_a:'SELECT c.name, SUM(o.amount) total\nFROM orders o\nJOIN customers c ON c.id=o.customer_id\nWHERE o.date >= date(\'now\',\'-30 days\')\nGROUP BY c.id, c.name\nORDER BY total DESC\nLIMIT 5;',output_b:'SELECT c.name, ROUND(SUM(o.amount),2) revenue\nFROM customers c\nINNER JOIN orders o ON o.customer_id=c.id\nWHERE o.date BETWEEN DATE_SUB(NOW(),INTERVAL 30 DAY) AND NOW()\nGROUP BY c.id\nORDER BY revenue DESC\nLIMIT 5;',winner:'draw',elo_a:1521,elo_b:1489},
];
