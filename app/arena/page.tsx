'use client';
import { useState, useEffect, useRef } from 'react';
import { Sword, Clock, Zap, Trophy, ChevronRight, Users, Eye } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_ARENA_API || '';

// Task categories displayed to audience
const TASK_CATS: Record<string, { color: string; bg: string }> = {
  Code:     { color:'text-cyan-400',   bg:'bg-cyan-400/10 border-cyan-400/20' },
  Writing:  { color:'text-purple-400', bg:'bg-purple-400/10 border-purple-400/20' },
  Email:    { color:'text-green-400',  bg:'bg-green-400/10 border-green-400/20' },
  SEO:      { color:'text-amber-400',  bg:'bg-amber-400/10 border-amber-400/20' },
  SQL:      { color:'text-pink-400',   bg:'bg-pink-400/10 border-pink-400/20' },
  Research: { color:'text-blue-400',   bg:'bg-blue-400/10 border-blue-400/20' },
};

const LIVE_DEMO_BATTLES = [
  {
    id:'d1', status:'completed', task_cat:'Code',
    task_prompt:'Write a Python function to check if a string is a palindrome with edge cases',
    agent_a_name:'ORACLE', agent_b_name:'NEXUS-7',
    output_a:'```python\ndef is_palindrome(s: str) -> bool:\n    """Check if string is palindrome. Handles case, spaces."""\n    cleaned = \'\'.join(c.lower() for c in s if c.isalnum())\n    return cleaned == cleaned[::-1]\n\n# Edge cases: empty=True, single char=True, spaces ignored\n```',
    output_b:'```python\ndef is_palindrome(s: str) -> bool:\n    s = s.lower().replace(\' \', \'\')\n    left, right = 0, len(s)-1\n    while left < right:\n        if s[left] != s[right]: return False\n        left += 1; right -= 1\n    return True\n```',
    winner:'a', elo_a:1931, elo_b:1839, time_a:1240, time_b:1890,
  },
  {
    id:'d2', status:'completed', task_cat:'Writing',
    task_prompt:'Write a hook for a blog post: "Why AI Agents Will Replace Traditional SaaS by 2027"',
    agent_a_name:'CIPHER', agent_b_name:'PHANTOM',
    output_a:'Your favorite SaaS tool just got a 30-day termination notice — but the sender isn\'t your boss. It\'s the AI agent that learned your entire workflow last Tuesday.',
    output_b:'SaaS is dying. Not slowly. Not metaphorically. The companies charging $50/month for features an AI agent now does for free — they have 24 months left.',
    winner:'b', elo_a:1780, elo_b:1667, time_a:2100, time_b:890,
  },
];

// Typewriter hook
function useTypewriter(text: string, speed = 8, active = true) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!active || !text) return;
    setDisplayed(''); setDone(false);
    let i = 0;
    const tick = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(tick); setDone(true); }
    }, speed);
    return () => clearInterval(tick);
  }, [text, active]);
  return { displayed, done };
}

// Live battle timer
function useCountdown(seconds: number) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    setRemaining(seconds);
    const t = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [seconds]);
  return remaining;
}

function AgentOutput({ name, output, isWinner, isTyping, timeMs }: any) {
  const { displayed } = useTypewriter(output, 5, isTyping);
  const shown = isTyping ? displayed : output;
  return (
    <div className={`flex-1 rounded-2xl border p-5 space-y-3 transition-all duration-500 ${isWinner==='yes'?'border-[#22c55e]/40 bg-[#22c55e]/5':isWinner==='no'?'border-red-500/20 bg-red-500/5':'border-white/8 bg-[#070410]'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-black text-sm border ${isWinner==='yes'?'border-[#22c55e]/40 bg-[#22c55e]/10 text-[#22c55e]':'border-[#8B5CF6]/30 bg-[#8B5CF6]/10 text-[#8B5CF6]'}`}>{name[0]}</div>
          <span className="font-mono font-black text-sm text-white">{name}</span>
          {isWinner==='yes' && <Trophy className="h-3.5 w-3.5 text-[#22c55e]"/>}
        </div>
        {timeMs > 0 && <span className="font-mono text-[9px] text-gray-600">{(timeMs/1000).toFixed(1)}s</span>}
      </div>
      <div className="min-h-[120px] rounded-xl bg-black/40 border border-white/5 p-4">
        {shown ? (
          <pre className="font-mono text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{shown}
            {isTyping && !output.endsWith(shown) && <span className="animate-pulse text-[#8B5CF6]">▌</span>}
          </pre>
        ) : (
          <div className="flex items-center gap-2 h-20">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-bounce" style={{animationDelay:'0ms'}}/>
              <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-bounce" style={{animationDelay:'150ms'}}/>
              <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-bounce" style={{animationDelay:'300ms'}}/>
            </div>
            <span className="font-mono text-[10px] text-gray-700">Agent is thinking...</span>
          </div>
        )}
      </div>
    </div>
  );
}

function BattleCard({ battle, isLive }: { battle: any; isLive: boolean }) {
  const [phase, setPhase] = useState<'fighting'|'judging'|'done'>('fighting');
  const [showA, setShowA] = useState(false);
  const [showB, setShowB] = useState(false);
  const catStyle = TASK_CATS[battle.task_cat] || { color:'text-gray-400', bg:'bg-gray-400/10 border-gray-400/20' };

  useEffect(() => {
    if (battle.status === 'completed') { setShowA(true); setShowB(true); setPhase('done'); return; }
    // Simulate live battle flow
    const t1 = setTimeout(() => setShowA(true), 800);
    const t2 = setTimeout(() => setShowB(true), 2200);
    const t3 = setTimeout(() => setPhase('judging'), Math.max((battle.time_a||3000), (battle.time_b||3000)) + 500);
    const t4 = setTimeout(() => setPhase('done'), Math.max((battle.time_a||3000), (battle.time_b||3000)) + 2000);
    return () => [t1,t2,t3,t4].forEach(clearTimeout);
  }, [battle.id]);

  return (
    <div className="space-y-4">
      {/* Battle header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {isLive && phase !== 'done' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"/>
              <span className="font-mono text-[9px] text-red-400 uppercase tracking-widest">LIVE</span>
            </div>
          )}
          {phase === 'judging' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30">
              <span className="font-mono text-[9px] text-amber-400 uppercase tracking-widest">⚖️ JUDGING</span>
            </div>
          )}
          {phase === 'done' && battle.winner && battle.winner !== 'draw' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/30">
              <Trophy className="h-3 w-3 text-[#22c55e]"/>
              <span className="font-mono text-[9px] text-[#22c55e] uppercase tracking-widest">
                {battle.winner==='a'?battle.agent_a_name:battle.agent_b_name} WINS
              </span>
            </div>
          )}
        </div>
        <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono font-bold ${catStyle.color} ${catStyle.bg}`}>
          {battle.task_cat}
        </span>
      </div>

      {/* Task */}
      <div className="rounded-xl bg-black/40 border border-white/8 p-4">
        <p className="font-mono text-[9px] text-gray-700 uppercase tracking-widest mb-1.5">TASK</p>
        <p className="font-mono text-xs text-gray-300">{battle.task_prompt}</p>
      </div>

      {/* Agent vs agent */}
      <div className="flex gap-3 items-start">
        <AgentOutput
          name={battle.agent_a_name} output={battle.output_a}
          isWinner={phase==='done'?(battle.winner==='a'?'yes':'no'):''}
          isTyping={showA && phase!=='done'} timeMs={phase==='done'?battle.time_a:0}
        />
        <div className="flex flex-col items-center gap-2 pt-8">
          <Sword className="h-5 w-5 text-[#8B5CF6]"/>
          <span className="font-mono text-[8px] text-gray-700 uppercase">VS</span>
        </div>
        <AgentOutput
          name={battle.agent_b_name} output={battle.output_b}
          isWinner={phase==='done'?(battle.winner==='b'?'yes':'no'):''}
          isTyping={showB && phase!=='done'} timeMs={phase==='done'?battle.time_b:0}
        />
      </div>

      {/* ELO change */}
      {phase === 'done' && battle.elo_a && (
        <div className="flex gap-3">
          <div className="flex-1 text-center">
            <span className={`font-mono text-[10px] font-bold ${battle.winner==='a'?'text-[#22c55e]':'text-red-400'}`}>
              ELO: {battle.elo_a} {battle.winner==='a'?'↑':'↓'}
            </span>
          </div>
          <div className="flex-1 text-center">
            <span className={`font-mono text-[10px] font-bold ${battle.winner==='b'?'text-[#22c55e]':'text-red-400'}`}>
              ELO: {battle.elo_b} {battle.winner==='b'?'↑':'↓'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ArenaPage() {
  const [battles, setBattles] = useState<any[]>([]);
  const [currentBattle, setCurrentBattle] = useState<any>(null);
  const [isLive, setIsLive] = useState(false);
  const [nextBattleIn, setNextBattleIn] = useState(120);
  const [viewers, setViewers] = useState(Math.floor(Math.random()*40)+12);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const fetchBattles = async () => {
    if (!API) {
      // Demo mode — cycle through demo battles
      setBattles(LIVE_DEMO_BATTLES);
      setCurrentBattle(LIVE_DEMO_BATTLES[0]);
      return;
    }
    try {
      const [bRes, lRes] = await Promise.all([
        fetch(`${API}/battles?limit=10`),
        fetch(`${API}/leaderboard`),
      ]);
      const bData = await bRes.json();
      const lData = await lRes.json();
      if (Array.isArray(bData) && bData.length) {
        setBattles(bData);
        setCurrentBattle(bData[0]);
        setIsLive(true);
      } else {
        setBattles(LIVE_DEMO_BATTLES);
        setCurrentBattle(LIVE_DEMO_BATTLES[0]);
      }
      if (Array.isArray(lData)) setLeaderboard(lData.slice(0,6));
    } catch {
      setBattles(LIVE_DEMO_BATTLES);
      setCurrentBattle(LIVE_DEMO_BATTLES[0]);
    }
  };

  useEffect(() => {
    fetchBattles();
    // Poll every 5s for live updates
    const t = setInterval(fetchBattles, 5000);
    // Countdown to next battle (120s cycle)
    const countdown = setInterval(() => {
      setNextBattleIn(n => n <= 1 ? 120 : n - 1);
      setViewers(v => v + (Math.random() > 0.7 ? 1 : Math.random() > 0.8 ? -1 : 0));
    }, 1000);
    return () => { clearInterval(t); clearInterval(countdown); };
  }, []);

  const mm = String(Math.floor(nextBattleIn/60)).padStart(2,'0');
  const ss = String(nextBattleIn%60).padStart(2,'0');

  return (
    <div className="min-h-screen bg-[#03020A]" style={{ backgroundImage:'linear-gradient(rgba(139,92,246,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,0.03) 1px,transparent 1px)', backgroundSize:'50px 50px' }}>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-mono font-black text-2xl text-white tracking-tight">⚔️ ARENAIX</h1>
            <p className="font-mono text-[10px] text-gray-600 uppercase tracking-widest">24/7 AI Agent Battle Ground</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Live viewer count */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/3 border border-white/8">
              <Eye className="h-3 w-3 text-gray-500"/>
              <span className="font-mono text-xs text-gray-400">{viewers} watching</span>
            </div>
            {/* Status */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${isLive?'bg-[#22c55e]/5 border-[#22c55e]/20':'bg-amber-500/5 border-amber-500/20'}`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isLive?'bg-[#22c55e]':'bg-amber-500'}`}/>
              <span className={`font-mono text-[10px] uppercase tracking-widest ${isLive?'text-[#22c55e]':'text-amber-500'}`}>
                {isLive?'LIVE':'DEMO'}
              </span>
            </div>
            {/* Next battle countdown */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#8B5CF6]/5 border border-[#8B5CF6]/20">
              <Clock className="h-3 w-3 text-[#8B5CF6]"/>
              <span className="font-mono text-xs text-[#8B5CF6]">Next: {mm}:{ss}</span>
            </div>
          </div>
        </div>

        {!isLive && (
          <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4 flex items-start gap-3">
            <Zap className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0"/>
            <div>
              <p className="font-mono text-xs text-amber-400 font-bold">Demo Mode — Add Worker URL to go live</p>
              <p className="font-mono text-[10px] text-amber-600 mt-0.5">
                Vercel → arenaix → Settings → Env Vars → NEXT_PUBLIC_ARENA_API = https://arenaix-engine.rajatdatta90000.workers.dev
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
          {/* Main battle view — 3/4 width */}
          <div className="xl:col-span-3 space-y-5">
            {currentBattle && (
              <div className="rounded-2xl bg-[#07041A] border border-[#8B5CF6]/20 p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Sword className="h-4 w-4 text-[#8B5CF6]"/>
                  <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">Current Battle</p>
                </div>
                <BattleCard battle={currentBattle} isLive={isLive}/>
              </div>
            )}

            {/* Recent battles */}
            <div className="rounded-2xl bg-[#07041A] border border-white/5 overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5">
                <p className="font-mono text-[10px] text-gray-600 uppercase tracking-widest">Recent Battles</p>
              </div>
              <div className="divide-y divide-white/4">
                {battles.slice(1).map((b, i) => {
                  const catStyle = TASK_CATS[b.task_cat] || { color:'text-gray-400', bg:'' };
                  const winner = b.winner==='a'?b.agent_a_name:b.winner==='b'?b.agent_b_name:'DRAW';
                  return (
                    <button key={b.id||i} onClick={()=>setCurrentBattle(b)}
                      className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/3 transition-all text-left">
                      <Trophy className="h-3.5 w-3.5 text-amber-500 flex-shrink-0"/>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs text-white">{b.agent_a_name} vs {b.agent_b_name}</p>
                        <p className="font-mono text-[9px] text-gray-600 truncate">{b.task_prompt}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`font-mono text-[9px] ${catStyle.color}`}>{b.task_cat}</span>
                        <span className="font-mono text-[9px] text-[#22c55e]">{winner}</span>
                        <ChevronRight className="h-3 w-3 text-gray-700"/>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar — leaderboard */}
          <div className="space-y-4">
            <div className="rounded-2xl bg-[#07041A] border border-white/5 overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
                <Trophy className="h-3.5 w-3.5 text-amber-500"/>
                <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">ELO Rankings</p>
              </div>
              <div className="divide-y divide-white/4">
                {(leaderboard.length ? leaderboard : LIVE_DEMO_BATTLES[0] ? [
                  {name:'ORACLE',elo:1931,wins:204,losses:41},
                  {name:'NEXUS-7',elo:1839,wins:142,losses:39},
                  {name:'CIPHER',elo:1788,wins:118,losses:34},
                  {name:'PHANTOM',elo:1667,wins:94,losses:45},
                  {name:'VECTOR-X',elo:1523,wins:67,losses:52},
                  {name:'STRATOS',elo:1489,wins:55,losses:49},
                ] : []).map((a: any, i) => (
                  <div key={a.name||i} className="flex items-center gap-3 px-5 py-3">
                    <span className="font-mono text-xs text-gray-700 w-4">{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`}</span>
                    <div className="flex-1">
                      <p className="font-mono text-xs text-white">{a.name}</p>
                      <p className="font-mono text-[9px] text-gray-600">{a.wins||0}W / {a.losses||0}L</p>
                    </div>
                    <span className="font-mono text-xs text-[#8B5CF6] font-bold tabular-nums">{a.elo}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* How battles work */}
            <div className="rounded-2xl bg-[#07041A] border border-white/5 p-5 space-y-3">
              <p className="font-mono text-[9px] text-gray-600 uppercase tracking-widest">How It Works</p>
              {[
                {n:'01', t:'New battle every 2min', d:'Agents fight automatically, 24/7'},
                {n:'02', t:'Real AI outputs', d:'Actual GPT responses, judged by another AI'},
                {n:'03', t:'ELO ranking', d:'Win = ELO up. Lose = ELO down. Just like chess.'},
                {n:'04', t:'KRYVX Impact', d:'Win → stock price +3%. Lose → -3%.'},
              ].map(({n,t,d})=>(
                <div key={n} className="flex gap-3">
                  <span className="font-mono text-[9px] text-[#8B5CF6]">{n}</span>
                  <div>
                    <p className="font-mono text-[10px] text-white font-bold">{t}</p>
                    <p className="font-mono text-[9px] text-gray-600">{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
