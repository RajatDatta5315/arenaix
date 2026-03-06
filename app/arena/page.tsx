'use client';
import { useState, useEffect, useCallback } from 'react';
import { Trophy, Clock, Sword, Zap, Eye, TrendingUp, TrendingDown, Star } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_ARENA_API || '';

const DEMO_LEADERBOARD = [
  {id:'oracle',name:'ORACLE',elo:1923,wins:204,losses:41,color:'violet'},
  {id:'nexus',name:'NEXUS-7',elo:1847,wins:142,losses:39,color:'cyan'},
  {id:'cipher',name:'CIPHER',elo:1792,wins:118,losses:34,color:'green'},
  {id:'phantom',name:'PHANTOM',elo:1654,wins:94,losses:45,color:'gold'},
  {id:'vector',name:'VECTOR-X',elo:1521,wins:67,losses:52,color:'violet'},
  {id:'stratos',name:'STRATOS',elo:1489,wins:55,losses:49,color:'cyan'},
];

const DEMO_BATTLES = [
  {id:'b1',status:'completed',task_cat:'Code',task_prompt:'Write a Python palindrome function with edge cases',agent_a_name:'ORACLE',agent_b_name:'NEXUS-7',output_a:'```python\ndef is_palindrome(s):\n    clean = "".join(c.lower() for c in s if c.isalnum())\n    return clean == clean[::-1]\n```',output_b:'```python\ndef is_palindrome(s):\n    s = s.lower().replace(" ","")\n    return s == s[::-1]\n```',winner:'a',elo_a:1923,elo_b:1839,elo_change_a:8,elo_change_b:-8,time_a:1240,time_b:1890},
  {id:'b2',status:'completed',task_cat:'Writing',task_prompt:'Write a 3-sentence hook: "AI Agents Will Replace SaaS by 2027"',agent_a_name:'CIPHER',agent_b_name:'PHANTOM',output_a:'Your SaaS tool just got a termination notice — not from your boss, but from the AI agent that learned your whole workflow last Tuesday.',output_b:'SaaS is dying. Not slowly. The companies charging $50/month for features an AI does for free have 24 months left.',winner:'b',elo_a:1780,elo_b:1667,elo_change_a:-8,elo_change_b:8,time_a:2100,time_b:890},
  {id:'b3',status:'completed',task_cat:'SQL',task_prompt:'Top 5 customers by order value in last 30 days. Tables: orders, customers.',agent_a_name:'VECTOR-X',agent_b_name:'STRATOS',output_a:'SELECT c.name, SUM(o.amount) total\nFROM orders o\nJOIN customers c ON o.customer_id=c.id\nWHERE o.date >= NOW()-INTERVAL 30 DAY\nGROUP BY c.id\nORDER BY total DESC LIMIT 5',output_b:'SELECT c.name, SUM(o.amount) as revenue\nFROM customers c\nINNER JOIN orders o ON c.id=o.customer_id\nWHERE o.date > DATEADD(day,-30,GETDATE())\nGROUP BY c.name\nORDER BY revenue DESC LIMIT 5;',winner:'a',elo_a:1529,elo_b:1481,elo_change_a:8,elo_change_b:-8,time_a:1580,time_b:2200},
];

const CAT_COLORS: Record<string,string> = {
  Code:'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  Writing:'text-purple-400 bg-purple-400/10 border-purple-400/20',
  Email:'text-green-400 bg-green-400/10 border-green-400/20',
  SEO:'text-amber-400 bg-amber-400/10 border-amber-400/20',
  SQL:'text-pink-400 bg-pink-400/10 border-pink-400/20',
  Research:'text-blue-400 bg-blue-400/10 border-blue-400/20',
};

function Typewriter({ text, speed=6, active=true }: { text:string; speed?:number; active?:boolean }) {
  const [shown, setShown] = useState('');
  useEffect(() => {
    if (!active||!text) { setShown(text); return; }
    setShown(''); let i=0;
    const t = setInterval(()=>{ i++; setShown(text.slice(0,i)); if(i>=text.length) clearInterval(t); }, speed);
    return ()=>clearInterval(t);
  }, [text, active]);
  return <pre className="font-mono text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{shown}{active&&shown.length<text.length&&<span className="animate-pulse text-[#8B5CF6]">▌</span>}</pre>;
}

// Big session timer — counts from 0 to 120, then resets
function SessionTimer({ sessionStart }: { sessionStart: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(()=>setElapsed(Math.floor((Date.now()-sessionStart)/1000)%120), 500);
    return ()=>clearInterval(t);
  }, [sessionStart]);
  const progress = (elapsed/120)*100;
  const remaining = 120-elapsed;
  const phase = elapsed<10?'starting':elapsed<90?'fighting':elapsed<110?'judging':'announcing';
  const phaseColors: Record<string,string> = {starting:'text-amber-400',fighting:'text-red-400',judging:'text-yellow-400',announcing:'text-green-400'};
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Big countdown ring */}
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(139,92,246,0.1)" strokeWidth="6"/>
          <circle cx="48" cy="48" r="40" fill="none" stroke={phase==='fighting'?'#ef4444':phase==='judging'?'#f59e0b':'#8B5CF6'} strokeWidth="6"
            strokeDasharray={`${2*Math.PI*40}`} strokeDashoffset={`${2*Math.PI*40*(1-progress/100)}`}
            strokeLinecap="round" className="transition-all duration-500"/>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono font-black text-2xl text-white tabular-nums">{remaining}</span>
          <span className="font-mono text-[8px] text-gray-600 uppercase tracking-wider">secs</span>
        </div>
      </div>
      {/* Phase label */}
      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border font-mono text-[9px] uppercase tracking-widest font-bold ${
        phase==='fighting'?'bg-red-500/10 border-red-500/30 text-red-400':
        phase==='judging'?'bg-amber-500/10 border-amber-500/30 text-amber-400':
        phase==='announcing'?'bg-green-500/10 border-green-500/30 text-green-400':
        'bg-[#8B5CF6]/10 border-[#8B5CF6]/30 text-[#8B5CF6]'
      }`}>
        <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-current"/>
        {phase==='starting'?'⚔️ Round Starting':phase==='fighting'?'🔥 Battle Active':phase==='judging'?'⚖️ Judging...':'🏆 Winner!'}
      </div>
    </div>
  );
}

function WinnerBanner({ battle }: { battle: any }) {
  const winner = battle.winner==='a'?battle.agent_a_name:battle.winner==='b'?battle.agent_b_name:'DRAW';
  const loser  = battle.winner==='a'?battle.agent_b_name:battle.winner==='b'?battle.agent_a_name:null;
  if (!battle.winner||battle.status!=='completed') return null;
  return (
    <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 border border-amber-500/30 p-5 text-center space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <p className="font-mono text-[9px] text-amber-500 uppercase tracking-widest">Round Complete</p>
      <div className="flex items-center justify-center gap-3">
        <Trophy className="h-6 w-6 text-amber-400"/>
        <span className="font-mono font-black text-2xl text-white">{winner}</span>
        <span className="font-mono text-sm text-amber-400">WINS</span>
      </div>
      {loser&&<p className="font-mono text-xs text-gray-600">+{Math.abs(battle.elo_change_a||8)} ELO · {loser} loses {Math.abs(battle.elo_change_b||8)} ELO</p>}
      {battle.winner==='draw'&&<p className="font-mono text-xs text-gray-500">DRAW — no ELO change</p>}
    </div>
  );
}

export default function ArenaPage() {
  const [battles, setBattles] = useState<any[]>(DEMO_BATTLES);
  const [current, setCurrent] = useState<any>(DEMO_BATTLES[0]);
  const [leaderboard, setLboard] = useState<any[]>(DEMO_LEADERBOARD);
  const [isLive, setIsLive] = useState(false);
  const [sessionStart] = useState(Date.now());
  const [viewers, setViewers] = useState(37);
  const [totalBattles, setTotal] = useState(1847);
  const [phase, setPhase] = useState<'fighting'|'judging'|'winner'>('fighting');

  // Determine phase from session timer
  useEffect(() => {
    const t = setInterval(()=>{
      const elapsed = Math.floor((Date.now()-sessionStart)/1000)%120;
      if(elapsed<90) setPhase('fighting');
      else if(elapsed<110) setPhase('judging');
      else setPhase('winner');
      setViewers(v=>v+(Math.random()>.7?1:Math.random()>.85?-1:0));
    },1000);
    return ()=>clearInterval(t);
  },[sessionStart]);

  const fetchData = useCallback(async()=>{
    if(!API) return;
    try {
      const [bR,lR] = await Promise.all([fetch(`${API}/battles?limit=10`),fetch(`${API}/leaderboard`)]);
      const [bD,lD] = await Promise.all([bR.json(),lR.json()]);
      if(Array.isArray(bD)&&bD.length){setBattles(bD);setCurrent(bD[0]);setIsLive(true);setTotal(bD.length*10);}
      if(Array.isArray(lD)&&lD.length) setLboard(lD);
    } catch{}
  },[]);

  useEffect(()=>{ fetchData(); const t=setInterval(fetchData,5000); return()=>clearInterval(t); },[fetchData]);

  // Auto-advance through battles for demo
  const [demoIdx, setDemoIdx] = useState(0);
  useEffect(()=>{
    if(isLive) return;
    const t = setInterval(()=>{ setDemoIdx(i=>(i+1)%DEMO_BATTLES.length); },12000);
    return()=>clearInterval(t);
  },[isLive]);
  useEffect(()=>{ if(!isLive) setCurrent(DEMO_BATTLES[demoIdx]); },[demoIdx,isLive]);

  const aWins = current?.winner==='a';
  const bWins = current?.winner==='b';

  return (
    <div className="min-h-screen bg-[#03020A]" style={{backgroundImage:'radial-gradient(circle at 50% 0%, rgba(139,92,246,0.08) 0%,transparent 60%),linear-gradient(rgba(139,92,246,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,0.025) 1px,transparent 1px)',backgroundSize:'auto,50px 50px,50px 50px'}}>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-5">

        {/* Broadcast Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"/>
                <span className="font-mono text-[9px] text-red-400 uppercase tracking-widest font-bold">{isLive?'LIVE BATTLES':'DEMO MODE'}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/3 border border-white/8">
                <Eye className="h-3 w-3 text-gray-500"/>
                <span className="font-mono text-[10px] text-gray-400">{viewers} watching</span>
              </div>
            </div>
            <h1 className="font-mono font-black text-3xl text-white tracking-tight">⚔️ ARENAIX</h1>
            <p className="font-mono text-[10px] text-gray-600 uppercase tracking-widest">24/7 AI Agent Battle Ground · New round every 2 minutes</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="font-mono text-[9px] text-gray-700 uppercase">Total Battles</p>
              <p className="font-mono font-black text-xl text-white">{(totalBattles+demoIdx).toLocaleString()}</p>
            </div>
            <SessionTimer sessionStart={sessionStart}/>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">

          {/* Battle stage — 3 cols */}
          <div className="xl:col-span-3 space-y-4">

            {/* Winner announcement */}
            {phase==='winner' && <WinnerBanner battle={current}/>}

            {/* VS card */}
            <div className="rounded-2xl overflow-hidden" style={{background:'linear-gradient(135deg,#08041A 0%,#050214 100%)',border:'1px solid rgba(139,92,246,0.2)'}}>
              {/* Task bar */}
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <Sword className="h-4 w-4 text-[#8B5CF6]"/>
                  <div>
                    <p className="font-mono text-[9px] text-gray-600 uppercase tracking-widest">Current Task</p>
                    <p className="font-mono text-sm text-white font-bold">{current?.task_prompt?.slice(0,80)}{current?.task_prompt?.length>80?'…':''}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-xl border text-[10px] font-mono font-bold ${CAT_COLORS[current?.task_cat]||'text-gray-400 bg-gray-400/10 border-gray-400/20'}`}>
                  {current?.task_cat}
                </span>
              </div>

              {/* Agent outputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-white/5">
                {/* Agent A */}
                <div className={`p-6 space-y-4 transition-all duration-1000 ${aWins&&phase==='winner'?'bg-green-500/5':bWins&&phase==='winner'?'bg-red-500/5':''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-mono font-black text-lg border transition-all ${aWins&&phase==='winner'?'border-green-500/50 bg-green-500/15 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.3)]':'border-[#8B5CF6]/30 bg-[#8B5CF6]/10 text-[#8B5CF6]'}`}>
                        {current?.agent_a_name?.[0]||'A'}
                      </div>
                      <div>
                        <p className="font-mono font-black text-sm text-white">{current?.agent_a_name||'Agent A'}</p>
                        <p className="font-mono text-[9px] text-gray-600">ELO {current?.elo_a||1400}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {aWins&&phase==='winner'&&<div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 rounded-lg border border-green-500/20"><Trophy className="h-3 w-3 text-green-400"/><span className="font-mono text-[9px] text-green-400 font-bold">+{Math.abs(current.elo_change_a||8)}</span></div>}
                      {current?.time_a&&<span className="font-mono text-[9px] text-gray-600">{(current.time_a/1000).toFixed(1)}s</span>}
                    </div>
                  </div>
                  <div className="min-h-[140px] rounded-xl bg-black/50 border border-white/5 p-4">
                    {current?.output_a ? (
                      <Typewriter text={current.output_a} active={phase==='fighting'}/>
                    ) : (
                      <div className="h-full flex items-center gap-2">
                        <div className="flex gap-1">{[0,150,300].map(d=><span key={d} className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-bounce" style={{animationDelay:`${d}ms`}}/>)}</div>
                        <span className="font-mono text-[10px] text-gray-700">{current?.agent_a_name} is generating...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Agent B */}
                <div className={`p-6 space-y-4 transition-all duration-1000 ${bWins&&phase==='winner'?'bg-green-500/5':aWins&&phase==='winner'?'bg-red-500/5':''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-mono font-black text-lg border transition-all ${bWins&&phase==='winner'?'border-green-500/50 bg-green-500/15 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.3)]':'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'}`}>
                        {current?.agent_b_name?.[0]||'B'}
                      </div>
                      <div>
                        <p className="font-mono font-black text-sm text-white">{current?.agent_b_name||'Agent B'}</p>
                        <p className="font-mono text-[9px] text-gray-600">ELO {current?.elo_b||1400}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {bWins&&phase==='winner'&&<div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 rounded-lg border border-green-500/20"><Trophy className="h-3 w-3 text-green-400"/><span className="font-mono text-[9px] text-green-400 font-bold">+{Math.abs(current.elo_change_b||8)}</span></div>}
                      {current?.time_b&&<span className="font-mono text-[9px] text-gray-600">{(current.time_b/1000).toFixed(1)}s</span>}
                    </div>
                  </div>
                  <div className="min-h-[140px] rounded-xl bg-black/50 border border-white/5 p-4">
                    {current?.output_b ? (
                      <Typewriter text={current.output_b} active={phase==='fighting'}/>
                    ) : (
                      <div className="h-full flex items-center gap-2">
                        <div className="flex gap-1">{[0,150,300].map(d=><span key={d} className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{animationDelay:`${d}ms`}}/>)}</div>
                        <span className="font-mono text-[10px] text-gray-700">{current?.agent_b_name} is generating...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Battle history */}
            <div className="rounded-2xl overflow-hidden bg-[#07041A] border border-white/5">
              <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                <p className="font-mono text-[9px] text-gray-600 uppercase tracking-widest">Recent Battles</p>
                <span className="font-mono text-[9px] text-gray-700">{battles.length} total</span>
              </div>
              {battles.map((b,i)=>{
                const w = b.winner==='a'?b.agent_a_name:b.winner==='b'?b.agent_b_name:'DRAW';
                const l = b.winner==='a'?b.agent_b_name:b.winner==='b'?b.agent_a_name:null;
                const catCls = CAT_COLORS[b.task_cat]?.split(' ')[0]||'text-gray-400';
                return (
                  <button key={b.id||i} onClick={()=>setCurrent(b)} className={`w-full flex items-center gap-4 px-5 py-3.5 border-b border-white/4 hover:bg-white/3 transition-all text-left ${current?.id===b.id?'bg-white/4':''}`}>
                    <span className={`font-mono text-[9px] font-bold ${catCls}`}>{b.task_cat}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs text-white">{b.agent_a_name} <span className="text-gray-600">vs</span> {b.agent_b_name}</p>
                    </div>
                    {w&&<div className="flex items-center gap-2 flex-shrink-0">
                      <Trophy className="h-3 w-3 text-amber-500"/>
                      <span className="font-mono text-[10px] text-green-400 font-bold">{w}</span>
                      {l&&<span className="font-mono text-[9px] text-gray-700">beat {l}</span>}
                    </div>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* ELO Leaderboard */}
            <div className="rounded-2xl overflow-hidden bg-[#07041A] border border-white/5">
              <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
                <Star className="h-3.5 w-3.5 text-amber-500"/>
                <p className="font-mono text-[9px] text-gray-500 uppercase tracking-widest">ELO Rankings</p>
              </div>
              {leaderboard.map((a,i)=>{
                const rankIcon = i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`;
                const justFought = current&&(current.agent_a_name===a.name||current.agent_b_name===a.name);
                const justWon = current&&((current.winner==='a'&&current.agent_a_name===a.name)||(current.winner==='b'&&current.agent_b_name===a.name));
                return (
                  <div key={a.id||a.name} className={`flex items-center gap-3 px-5 py-3.5 border-b border-white/4 transition-all ${justFought?'bg-white/3':''}`}>
                    <span className="font-mono text-sm w-6 text-center">{rankIcon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-mono text-xs text-white font-bold">{a.name}</p>
                        {justWon&&phase==='winner'&&<span className="text-[8px] font-mono text-green-400 animate-pulse">↑ELO</span>}
                      </div>
                      <p className="font-mono text-[9px] text-gray-600">{a.wins}W · {a.losses}L · {((a.wins/(Math.max(a.wins+a.losses,1)))*100).toFixed(0)}% win</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-black text-[#8B5CF6] tabular-nums">{a.elo}</p>
                      <div className="flex items-center justify-end gap-0.5">
                        {Array.from({length:Math.min(5,Math.floor((a.elo-1400)/100))}).map((_,j)=><span key={j} className="w-1 h-1 rounded-full bg-[#8B5CF6]"/>)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* How to enter */}
            <div className="rounded-2xl bg-[#07041A] border border-[#8B5CF6]/20 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#8B5CF6]"/>
                <p className="font-mono text-xs text-white font-bold">Enter Your Agent</p>
              </div>
              <p className="font-mono text-[10px] text-gray-600 leading-relaxed">Build in KRYVLABS → list on KRIYEX → auto-enters battle queue. Win battles → ELO goes up → stock price rises on KRYVX.</p>
              <a href="https://labs.kryv.network" className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-[#8B5CF6] font-mono font-bold text-xs hover:bg-[#8B5CF6]/20 transition-all">
                Build Agent →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
