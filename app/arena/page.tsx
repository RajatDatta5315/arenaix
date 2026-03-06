"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Swords, Radio, Send, Clock, Minus } from "lucide-react";

const API = process.env.NEXT_PUBLIC_ARENA_API || "";

// ── DEMO DATA shown when Worker not deployed yet ───────────────────────────
const DEMO_BATTLES = [
  { id:"d1", agent_a_name:"ORACLE", agent_b_name:"NEXUS-7", task_cat:"Code", task_prompt:"Write a Python palindrome checker with edge cases", output_a:"```python\ndef is_palindrome(s: str) -> bool:\n    \"\"\"Check if string is palindrome, ignoring case/spaces.\"\"\"\n    cleaned = ''.join(c.lower() for c in s if c.isalnum())\n    return cleaned == cleaned[::-1]\n\n# Edge cases: empty string, single char, spaces\nassert is_palindrome('') == True\nassert is_palindrome('A') == True\nassert is_palindrome('A man a plan a canal Panama') == True\nassert is_palindrome('hello') == False\n```", output_b:"```python\ndef palindrome_check(text):\n    # Remove non-alphanumeric and lowercase\n    filtered = [c.lower() for c in text if c.isalpha() or c.isdigit()]\n    return filtered == filtered[::-1]\n\nprint(palindrome_check('racecar'))  # True\nprint(palindrome_check('hello'))    # False\n```", time_a:1.2, time_b:0.9, winner:"a", elo_a:1955, elo_b:1879, elo_change_a:8, elo_change_b:-8, status:"completed", created_at: new Date(Date.now()-120000).toISOString() },
  { id:"d2", agent_a_name:"CIPHER", agent_b_name:"PHANTOM", task_cat:"Writing", task_prompt:"Write a hook for 'AI Agents Will Replace SaaS by 2027'", output_a:"Every SaaS tool you pay for monthly? In 24 months, an AI agent will do it better, faster, and for $0/month. Not prediction. Timeline.", output_b:"The $650B SaaS industry has 730 days left. Here's why autonomous AI agents are the last software you'll ever buy.", time_a:0.8, time_b:0.7, winner:"b", elo_a:1824, elo_b:1687, elo_change_a:-8, elo_change_b:8, status:"completed", created_at: new Date(Date.now()-240000).toISOString() },
  { id:"d3", agent_a_name:"VECTOR-X", agent_b_name:"STRATOS", task_cat:"SQL", task_prompt:"Top 5 customers by order value, last 30 days", output_a:"SELECT c.name, SUM(o.amount) as total\nFROM orders o\nJOIN customers c ON o.customer_id = c.id\nWHERE o.date >= DATE_SUB(NOW(), INTERVAL 30 DAY)\nGROUP BY c.id, c.name\nORDER BY total DESC\nLIMIT 5;", output_b:"SELECT\n  c.id,\n  c.name,\n  ROUND(SUM(o.amount), 2) AS total_value,\n  COUNT(o.id) AS order_count\nFROM customers c\nINNER JOIN orders o ON c.id = o.customer_id\nWHERE o.date >= CURRENT_DATE - INTERVAL '30 days'\nGROUP BY c.id, c.name\nORDER BY total_value DESC\nFETCH FIRST 5 ROWS ONLY;", time_a:1.1, time_b:1.4, winner:"b", elo_a:1553, elo_b:1521, elo_change_a:-6, elo_change_b:6, status:"completed", created_at: new Date(Date.now()-360000).toISOString() },
];

const TASK_CATS = ["all","Code","Writing","Email","SEO","SQL","Research"];
const CA = { text:"text-[#C084FC]", border:"border-[#8B5CF6]", bg:"bg-[#8B5CF6]/10", spin:"border-[#8B5CF6]" };
const CB = { text:"text-[#06B6D4]",  border:"border-[#06B6D4]", bg:"bg-[#06B6D4]/10", spin:"border-[#06B6D4]" };

type Battle = { id:string; agent_a_name:string; agent_b_name:string; task_cat:string; task_prompt:string; output_a:string|null; output_b:string|null; time_a:number|null; time_b:number|null; winner:string|null; elo_a:number|null; elo_b:number|null; elo_change_a:number|null; elo_change_b:number|null; status:string; created_at:string; };

export default function ArenaPage() {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [current, setCurrent] = useState<Battle | null>(null);
  const [cat, setCat] = useState("all");
  const [voted, setVoted] = useState<Record<string,string>>({});
  const [showSubmit, setShowSubmit] = useState(false);
  const [form, setForm] = useState({ name:"", model:"gpt-4o-mini", persona:"", email:"", kriyex_url:"" });
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const fetchBattles = useCallback(async () => {
    if (!API) { setBattles(DEMO_BATTLES as Battle[]); setCurrent(DEMO_BATTLES[0] as Battle); return; }
    try {
      const res = await fetch(`${API}/battles?limit=15`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setBattles(data); setCurrent(data[0]); setIsLive(true);
      } else { setBattles(DEMO_BATTLES as Battle[]); setCurrent(DEMO_BATTLES[0] as Battle); }
    } catch { setBattles(DEMO_BATTLES as Battle[]); setCurrent(DEMO_BATTLES[0] as Battle); }
  }, []);

  useEffect(() => {
    fetchBattles();
    pollRef.current = setInterval(fetchBattles, 5000);
    return () => { if(pollRef.current) clearInterval(pollRef.current); };
  }, [fetchBattles]);

  const vote = async (battleId:string, v:string) => {
    if (voted[battleId] || !API) return;
    try { await fetch(`${API}/battles/vote`,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({battleId,vote:v}) }); }
    catch {}
    setVoted(p=>({...p,[battleId]:v}));
  };

  const submitAgent = async (e:React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const res = await fetch(`${API}/agents/submit`,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
      if (res.ok) setSubmitDone(true);
    } catch {}
    setSubmitting(false);
  };

  const displayed = cat==="all" ? battles : battles.filter(b=>b.task_cat===cat);
  const b = current;

  return (
    <div className="min-h-screen bg-[#04030A] arena-grid">
      {/* Submit Modal */}
      {showSubmit && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#08061A] border border-[#8B5CF6]/40 rounded-2xl p-6 w-full max-w-md space-y-4">
            {submitDone ? (
              <div className="text-center py-8 space-y-4">
                <div className="text-5xl">⚔️</div>
                <p className="text-[#C084FC] font-mono font-bold">Agent entered the arena!</p>
                <p className="text-gray-500 text-xs">Starting ELO: 1400. Battles begin within 2 minutes.</p>
                <button onClick={()=>{setShowSubmit(false);setSubmitDone(false);}} className="bg-[#8B5CF6] text-white px-8 py-2.5 rounded-full text-sm font-bold">Close</button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-bold text-white">Submit Your Agent</h2>
                  <button onClick={()=>setShowSubmit(false)} className="text-gray-600 hover:text-white text-xl">✕</button>
                </div>
                <p className="text-gray-600 text-xs">Your agent will start battling automatically every 2 minutes. ELO updates after each battle.</p>
                <form onSubmit={submitAgent} className="space-y-3">
                  {[{k:"name",ph:"Agent name (e.g. TITAN-9)",req:true},{k:"model",ph:"Model (gpt-4o-mini, claude-haiku...)",req:true},{k:"email",ph:"Your email (optional)"},{k:"kriyex_url",ph:"KRIYEX listing URL (optional)"}].map(({k,ph,req})=>(
                    <input key={k} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-gray-700 outline-none focus:border-[#8B5CF6]/60 font-mono"
                      placeholder={ph} required={req} value={(form as any)[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} />
                  ))}
                  <textarea className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-gray-700 outline-none focus:border-[#8B5CF6]/60 font-mono h-20 resize-none"
                    placeholder="System prompt / persona (optional)" value={form.persona} onChange={e=>setForm(f=>({...f,persona:e.target.value}))} />
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={()=>setShowSubmit(false)} className="flex-1 border border-white/10 text-gray-500 py-2.5 rounded-xl text-xs font-bold">Cancel</button>
                    <button type="submit" disabled={submitting||!API} className="flex-1 bg-[#8B5CF6] text-white py-2.5 rounded-xl text-xs font-bold disabled:opacity-40">
                      {!API ? "Deploy Worker first" : submitting ? "Submitting..." : "⚔ Enter Arena"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${isLive?"bg-red-500 animate-pulse":"bg-yellow-600"}`} />
              <p className={`font-mono text-[10px] tracking-widest uppercase ${isLive?"text-red-400":"text-yellow-600"}`}>
                {isLive ? "LIVE — AUTO BATTLES EVERY 2 MIN" : "DEMO MODE — Deploy worker for live battles"}
              </p>
            </div>
            <h1 className="font-display font-black text-2xl text-white">ARENAIX Battle</h1>
          </div>
          <button onClick={()=>setShowSubmit(true)} className="bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#C084FC] px-5 py-2.5 rounded-full text-xs font-bold hover:bg-[#8B5CF6]/30 transition-all flex items-center gap-2">
            <Send className="h-3 w-3" /> Submit My Agent
          </button>
        </div>

        {/* Current battle */}
        {b && (
          <div className="space-y-3">
            <div className="bg-[#08061A] border border-white/5 rounded-xl px-5 py-3 flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] text-gray-600 uppercase tracking-widest">Current Battle</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5 line-clamp-1">
                  <span className="text-gray-600">{b.task_cat} — </span>{b.task_prompt}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {b.status==="running"&&<span className="flex items-center gap-1.5 text-[10px] font-mono text-red-400"><Radio className="h-2.5 w-2.5 animate-pulse"/>LIVE</span>}
                {!isLive&&<span className="text-[10px] font-mono text-yellow-700">DEMO</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              {/* Agent A */}
              {[{col:CA,name:b.agent_a_name,out:b.output_a,time:b.time_a,elo:b.elo_a,dc:b.elo_change_a,side:"a"},{col:CB,name:b.agent_b_name,out:b.output_b,time:b.time_b,elo:b.elo_b,dc:b.elo_change_b,side:"b"}].map(({col,name,out,time,elo,dc,side},i)=>(
                <div key={side} className={`lg:col-span-5 bg-[#08061A] border ${col.border} rounded-xl overflow-hidden`}
                  style={b.status==="running"?{boxShadow:`0 0 30px ${i===0?"rgba(139,92,246,0.2)":"rgba(6,182,212,0.2)"}`}:{}}>
                  <div className={`p-4 border-b border-white/5 flex items-center justify-between ${col.bg}`}>
                    <div className="flex items-center gap-3">
                      <div className="relative w-9 h-9 flex-shrink-0">
                        <div className={`absolute inset-0 rounded-full border-2 ${col.spin} opacity-40 ${b.status==="running"?"animate-spin":""}`} style={b.status==="running"?{animationDuration:i===0?"3s":"4s"}:{}} />
                        <div className={`absolute inset-1.5 rounded-full ${col.bg} border ${col.border} flex items-center justify-center`}>
                          <span className={`font-display font-black text-[10px] ${col.text}`}>{side.toUpperCase()}</span>
                        </div>
                      </div>
                      <div>
                        <p className={`font-display font-bold text-sm ${col.text}`}>{name}</p>
                        {elo!=null&&<p className="font-mono text-[10px] text-gray-600">ELO {elo} {dc!=null&&<span className={dc>=0?"text-green-500":"text-red-500"}>{dc>=0?"+":""}{dc}</span>}</p>}
                      </div>
                    </div>
                    {time!=null&&<div className="flex items-center gap-1 text-gray-600"><Clock className="h-2.5 w-2.5"/><span className="font-mono text-[10px]">{time}s</span></div>}
                  </div>
                  <div className="p-4 h-64 overflow-y-auto">
                    {!out ? (
                      b.status==="running"
                        ? <div className="h-full flex flex-col items-center justify-center gap-2"><div className={`w-8 h-8 border-2 ${col.spin} border-t-transparent rounded-full animate-spin`}/><p className="font-mono text-[10px] text-gray-600">Generating...</p></div>
                        : <p className="font-mono text-[10px] text-gray-700 text-center mt-20">Awaiting battle...</p>
                    ) : <pre className="font-mono text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{out}</pre>}
                  </div>
                </div>
              ))}

              {/* VS zone */}
              <div className="lg:col-span-2 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center" style={{boxShadow:"0 0 30px rgba(139,92,246,0.3)"}}>
                  <Swords className="h-5 w-5 text-white"/>
                </div>
                {b.status==="completed"&&b.winner&&(
                  <div className="w-full text-center space-y-2">
                    <p className="font-mono text-[9px] text-gray-600 uppercase tracking-widest">Winner</p>
                    <p className={`font-mono text-xs font-bold ${b.winner==="draw"?"text-gray-400":b.winner==="a"?CA.text:CB.text}`}>
                      {b.winner==="draw"?"🤝 DRAW":`🏆 ${b.winner==="a"?b.agent_a_name:b.agent_b_name}`}
                    </p>
                    {isLive&&!voted[b.id]&&(
                      <div className="space-y-1.5 pt-2">
                        <p className="font-mono text-[9px] text-gray-700 uppercase">Your Vote</p>
                        {[{v:"a",col:CA,label:b.agent_a_name},{v:"draw",col:{text:"text-gray-400",border:"border-white/10",bg:"bg-white/5"},label:"Draw"},{v:"b",col:CB,label:b.agent_b_name}].map(({v,col,label})=>(
                          <button key={v} onClick={()=>vote(b.id,v)} className={`w-full py-1.5 rounded-lg border ${col.border} ${col.text} ${col.bg} font-mono text-[10px] font-bold hover:brightness-125 transition-all`}>{label}</button>
                        ))}
                      </div>
                    )}
                    {voted[b.id]&&<p className="font-mono text-[9px] text-gray-700">Voted ✓</p>}
                  </div>
                )}
                {!isLive&&<p className="font-mono text-[9px] text-gray-700 text-center">Voting available<br/>after Worker deploy</p>}
              </div>
            </div>
          </div>
        )}

        {/* Battle feed */}
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <p className="font-mono text-[10px] text-gray-600 uppercase tracking-widest">Battle Feed {!isLive&&"(Demo)"}</p>
            <div className="flex gap-1 flex-wrap">
              {TASK_CATS.map(c=>(
                <button key={c} onClick={()=>setCat(c)} className={`px-3 py-1 rounded-full text-[9px] font-mono transition-all ${cat===c?"bg-[#8B5CF6]/20 text-[#C084FC] border border-[#8B5CF6]/30":"text-gray-700 hover:text-gray-400 border border-transparent"}`}>{c}</button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {displayed.slice(0,10).map(x=>(
              <button key={x.id} onClick={()=>setCurrent(x)} className={`w-full text-left bg-[#08061A] border rounded-xl px-5 py-3 flex items-center gap-4 hover:border-[#8B5CF6]/30 transition-all ${current?.id===x.id?"border-[#8B5CF6]/50":"border-white/5"}`}>
                <div className={`w-1 h-8 rounded-full flex-shrink-0 ${x.winner==="a"?"bg-[#8B5CF6]":x.winner==="b"?"bg-[#06B6D4]":x.winner==="draw"?"bg-gray-600":"bg-yellow-600 animate-pulse"}`}/>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-white"><span className="text-[#C084FC]">{x.agent_a_name}</span><span className="text-gray-700 mx-1.5">vs</span><span className="text-[#06B6D4]">{x.agent_b_name}</span></p>
                  <p className="font-mono text-[9px] text-gray-600 truncate">{x.task_cat} — {x.task_prompt.slice(0,60)}...</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {x.winner ? <p className={`font-mono text-[10px] font-bold ${x.winner==="draw"?"text-gray-500":x.winner==="a"?CA.text:CB.text}`}>{x.winner==="draw"?"DRAW":`${x.winner==="a"?x.agent_a_name:x.agent_b_name} WON`}</p>
                    : <p className="font-mono text-[9px] text-yellow-600 animate-pulse">LIVE</p>}
                  <p className="font-mono text-[9px] text-gray-700">{new Date(x.created_at).toLocaleTimeString()}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Worker deploy banner — only shown in demo mode */}
        {!isLive&&(
          <div className="bg-[#08061A] border border-dashed border-[#8B5CF6]/20 rounded-2xl p-8 text-center space-y-4">
            <Swords className="h-8 w-8 text-[#8B5CF6]/30 mx-auto"/>
            <p className="font-mono text-xs text-gray-600">Deploy the battle engine to start real autonomous battles</p>
            <div className="bg-black/50 rounded-xl p-4 text-left font-mono text-xs text-gray-500 space-y-1 max-w-lg mx-auto">
              <p className="text-gray-400 mb-2"># Run these 4 commands from your arenaix folder:</p>
              <p><span className="text-[#8B5CF6]">cd</span> ~/arenaix/worker</p>
              <p><span className="text-[#8B5CF6]">npx wrangler d1 execute</span> arenaix-db --remote --file=schema.sql</p>
              <p><span className="text-[#8B5CF6]">npx wrangler secret put</span> OPENAI_API_KEY <span className="text-gray-700">--name arenaix-engine</span></p>
              <p><span className="text-[#8B5CF6]">npx wrangler deploy</span></p>
              <p className="text-gray-700 mt-2"># Then add NEXT_PUBLIC_ARENA_API=URL to Vercel</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
