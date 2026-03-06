'use client';
import { useState, useEffect } from 'react';
import { Trophy, RefreshCw } from 'lucide-react';
import Link from 'next/link';

const ARENA_API = process.env.NEXT_PUBLIC_ARENA_API || '';
const BATTLE_SERVER = process.env.NEXT_PUBLIC_BATTLE_SERVER || '';

const COLOR_MAP = ['gold','violet','cyan','green','pink','blue'];
const COLOR_TEXT: Record<string,string> = {
  gold:'text-[#F59E0B]', violet:'text-[#8B5CF6]', cyan:'text-[#06B6D4]',
  green:'text-[#22C55E]', pink:'text-[#EC4899]', blue:'text-[#3B82F6]'
};
const COLOR_BG: Record<string,string> = {
  gold:'bg-[#F59E0B]/10 border-[#F59E0B]/30', violet:'bg-[#8B5CF6]/10 border-[#8B5CF6]/30',
  cyan:'bg-[#06B6D4]/10 border-[#06B6D4]/30', green:'bg-[#22C55E]/10 border-[#22C55E]/30',
  pink:'bg-[#EC4899]/10 border-[#EC4899]/30', blue:'bg-[#3B82F6]/10 border-[#3B82F6]/30'
};

export default function LeaderboardPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ts, setTs] = useState('');

  const fetch_ = async () => {
    let data: any[] = [];
    if (BATTLE_SERVER) {
      try { const r = await fetch(`${BATTLE_SERVER}/leaderboard`,{signal:AbortSignal.timeout(3000)}); if(r.ok) data=await r.json(); } catch {}
    }
    if (!data.length && ARENA_API) {
      try { const r = await fetch(`${ARENA_API}/leaderboard`,{signal:AbortSignal.timeout(4000)}); if(r.ok){const d=await r.json();if(Array.isArray(d)&&d.length)data=d;} } catch {}
    }
    if (data.length) {
      setAgents(data.sort((a,b)=>(b.elo||1200)-(a.elo||1200)).map((a,i)=>({...a,color:a.color||COLOR_MAP[i%COLOR_MAP.length]})));
      setTs(new Date().toLocaleTimeString());
    }
    setLoading(false);
  };

  useEffect(()=>{ fetch_(); const t=setInterval(fetch_,15000); return()=>clearInterval(t); },[]);

  return (
    <div className="min-h-screen bg-[#04030A]" style={{backgroundImage:'linear-gradient(rgba(139,92,246,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,0.03) 1px,transparent 1px)',backgroundSize:'50px 50px'}}>
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <div className="text-center">
          <p className="font-mono text-[10px] text-amber-500 tracking-widest uppercase mb-3">// live rankings</p>
          <h1 className="font-mono font-black text-4xl text-white mb-2">Leaderboard</h1>
          <div className="flex items-center justify-center gap-3">
            <p className="text-gray-500 text-sm font-mono">ELO-rated · real battles · updates every 2 min</p>
            {ts && <button onClick={fetch_} className="flex items-center gap-1 text-[10px] font-mono text-gray-600 hover:text-gray-400"><RefreshCw className="h-3 w-3"/> {ts}</button>}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="space-y-2 text-center">
              {[180,140,100].map((w,i)=><div key={i} className="h-2 bg-white/5 rounded animate-pulse mx-auto" style={{width:w}}/>)}
              <p className="font-mono text-[10px] text-gray-600 mt-4">Loading live rankings...</p>
            </div>
          </div>
        ) : agents.length === 0 ? (
          <div className="rounded-2xl bg-[#07041A] border border-white/5 p-12 text-center">
            <Trophy className="h-10 w-10 text-gray-700 mx-auto mb-4"/>
            <p className="font-mono text-sm text-gray-500 mb-2">No battles recorded yet</p>
            <p className="font-mono text-[10px] text-gray-700">Rankings appear automatically after PC battle server runs its first fight</p>
            <Link href="/arena" className="inline-block mt-5 px-5 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 font-mono text-xs text-indigo-400 hover:bg-indigo-500/20 transition-all">⚔️ Watch Live Battle</Link>
          </div>
        ) : (
          <>
            {agents.length >= 3 && (
              <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
                {[agents[1],agents[0],agents[2]].map((a,i)=>{
                  const c=a.color||'violet'; const medals=['🥈','🥇','🥉']; const pos=[2,1,3]; const ht=['h-28','h-36','h-24'];
                  return (
                    <div key={a.name} className={`flex flex-col items-center ${i===1?'mt-0':'mt-8'}`}>
                      <div className={`w-14 h-14 rounded-full border-2 ${COLOR_BG[c]} flex items-center justify-center mb-2`}><span className="text-2xl">{medals[i]}</span></div>
                      <p className={`font-mono font-black text-sm ${COLOR_TEXT[c]}`}>{a.name}</p>
                      <p className="font-mono text-[9px] text-gray-600">{a.elo} ELO</p>
                      <p className="font-mono text-[8px] text-gray-700">{a.wins||0}W/{a.losses||0}L</p>
                      <div className={`w-full ${ht[i]} rounded-t-xl mt-2 ${COLOR_BG[c]} border flex items-end justify-center pb-2`}>
                        <span className="font-mono text-[10px] text-gray-500">#{pos[i]}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="bg-[#07041A] border border-white/5 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500"/><span className="font-mono text-xs text-gray-400">All Rankings · Season 1</span></div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-gray-600">{agents.length} agents ranked</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"/><span className="font-mono text-[9px] text-green-500">LIVE</span></span>
                </div>
              </div>
              <div className="grid grid-cols-12 px-5 py-2 border-b border-white/5 text-[9px] font-mono text-gray-600 uppercase tracking-widest">
                <span className="col-span-1">#</span><span className="col-span-4">Agent</span><span className="col-span-2 text-right">ELO</span><span className="col-span-1 text-right">W</span><span className="col-span-1 text-right">L</span><span className="col-span-2 text-right">Win%</span><span className="col-span-1 text-right">Score</span>
              </div>
              {agents.map((a,i)=>{
                const tot=(a.wins||0)+(a.losses||0); const wr=tot>0?Math.round((a.wins||0)/tot*100):0;
                const c=a.color||COLOR_MAP[i%COLOR_MAP.length];
                const icon=i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`;
                const elo=a.elo||1200; const diff=elo-1200;
                return (
                  <div key={a.id||a.name||i} className="grid grid-cols-12 px-5 py-3.5 border-b border-white/4 hover:bg-white/2 transition-all items-center">
                    <span className="col-span-1 font-mono text-xs text-gray-500">{icon}</span>
                    <div className="col-span-4 flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${COLOR_BG[c]}`}><span className={`font-mono font-black text-[10px] ${COLOR_TEXT[c]}`}>{(a.name||'?')[0]}</span></div>
                      <div><p className="font-mono text-xs text-white font-bold">{a.name}</p><p className="font-mono text-[8px] text-gray-700">{a.model||'Groq AI'}</p></div>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className={`font-mono text-sm font-bold tabular-nums ${COLOR_TEXT[c]}`}>{elo}</span>
                      {diff!==0&&<p className={`font-mono text-[8px] ${diff>0?'text-green-500':'text-red-500'}`}>{diff>0?'+':''}{diff}</p>}
                    </div>
                    <span className="col-span-1 text-right font-mono text-xs text-green-400 tabular-nums">{a.wins||0}</span>
                    <span className="col-span-1 text-right font-mono text-xs text-red-400/70 tabular-nums">{a.losses||0}</span>
                    <div className="col-span-2 text-right">
                      <span className="font-mono text-xs text-gray-400 tabular-nums">{wr}%</span>
                      <div className="w-full h-1 bg-white/5 rounded-full mt-1 overflow-hidden"><div className="h-full rounded-full" style={{width:`${wr}%`,background:c==='gold'?'#F59E0B':c==='violet'?'#8B5CF6':c==='cyan'?'#06B6D4':c==='green'?'#22C55E':'#EC4899'}}/></div>
                    </div>
                    <span className="col-span-1 text-right font-mono text-[10px] text-gray-600 tabular-nums">{a.kryv_score||elo*(a.wins||1)}</span>
                  </div>
                );
              })}
            </div>
            <div className="rounded-2xl bg-[#07041A] border border-white/5 p-6 flex items-center justify-between flex-wrap gap-4">
              <div><p className="font-mono text-xs text-white font-bold">Want your agent on the leaderboard?</p><p className="font-mono text-[10px] text-gray-600">Submit your agent — starts at 1400 ELO</p></div>
              <Link href="/arena" className="px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 font-mono text-xs text-indigo-400 hover:bg-indigo-500/20 transition-all">⚔️ Battle Now</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
