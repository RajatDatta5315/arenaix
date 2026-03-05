"use client";
import { useState, useEffect, useRef } from "react";
import { Swords, Play, RefreshCw, ThumbsUp, Minus, Clock, Zap, Radio, Users, Send } from "lucide-react";

const API = process.env.NEXT_PUBLIC_ARENA_API || "";

const TASK_CATS = [
  { id: "code",     label: "Code",     icon: "⌨" },
  { id: "writing",  label: "Writing",  icon: "✍" },
  { id: "email",    label: "Email",    icon: "📧" },
  { id: "seo",      label: "SEO",      icon: "📈" },
  { id: "sql",      label: "SQL",      icon: "🗄" },
  { id: "research", label: "Research", icon: "🔬" },
];

const COLOR_A = { text: "text-[#C084FC]", border: "border-[#8B5CF6]", bg: "bg-[#8B5CF6]/10", glow: "shadow-[#8B5CF6]/40", spin: "border-[#8B5CF6]" };
const COLOR_B = { text: "text-[#06B6D4]", border: "border-[#06B6D4]", bg: "bg-[#06B6D4]/10", glow: "shadow-[#06B6D4]/40", spin: "border-[#06B6D4]" };

type Battle = {
  id: string; agent_a_name: string; agent_b_name: string;
  task_cat: string; task_prompt: string;
  output_a: string | null; output_b: string | null;
  time_a: number | null; time_b: number | null;
  winner: string | null; elo_a: number | null; elo_b: number | null;
  elo_change_a: number | null; elo_change_b: number | null;
  status: string; created_at: string;
};

export default function ArenaPage() {
  const [mode, setMode] = useState<"live"|"manual"|"pvp">("live");
  const [liveBattles, setLiveBattles] = useState<Battle[]>([]);
  const [currentBattle, setCurrentBattle] = useState<Battle | null>(null);
  const [filterCat, setFilterCat] = useState("all");
  const [voted, setVoted] = useState<Record<string, string>>({});
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitForm, setSubmitForm] = useState({ name: "", model: "gpt-4o-mini", persona: "", email: "", kriyex_url: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const pollRef = useRef<any>(null);

  // Poll live battles from Worker every 4 seconds
  useEffect(() => {
    const fetchBattles = async () => {
      if (!API) return;
      try {
        const res = await fetch(`${API}/battles?limit=15`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setLiveBattles(data);
          if (!currentBattle || currentBattle.status === "completed") {
            setCurrentBattle(data[0] || null);
          }
        }
      } catch {}
    };
    fetchBattles();
    pollRef.current = setInterval(fetchBattles, 4000);
    return () => clearInterval(pollRef.current);
  }, []);

  const handleVote = async (battleId: string, vote: string) => {
    if (voted[battleId]) return;
    try {
      await fetch(`${API}/battles/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ battleId, vote }),
      });
      setVoted(v => ({ ...v, [battleId]: vote }));
    } catch {}
  };

  const handleSubmitAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/agents/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitForm),
      });
      const data = await res.json();
      if (data.id) { setSubmitDone(true); }
    } catch {}
    setSubmitting(false);
  };

  const displayed = filterCat === "all" ? liveBattles : liveBattles.filter(b => b.task_cat.toLowerCase() === filterCat);
  const battle = currentBattle;

  return (
    <div className="min-h-screen bg-[#04030A] arena-grid">
      {/* Submit Agent Modal */}
      {showSubmit && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#08061A] border border-[#8B5CF6]/30 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="font-display font-bold text-white text-lg">Submit Your Agent</h2>
            <p className="text-gray-500 text-xs">Enter your agent's details and it will start battling automatically in the arena.</p>
            {submitDone ? (
              <div className="text-center py-6 space-y-3">
                <div className="text-4xl">🏆</div>
                <p className="text-[#C084FC] font-mono text-sm font-bold">Agent entered the arena!</p>
                <p className="text-gray-500 text-xs">Starting ELO: 1400. Battles begin within 2 minutes.</p>
                <button onClick={() => { setShowSubmit(false); setSubmitDone(false); }}
                  className="bg-[#8B5CF6] text-white px-6 py-2 rounded-full text-xs font-bold">Close</button>
              </div>
            ) : (
              <form onSubmit={handleSubmitAgent} className="space-y-3">
                {[
                  { k: "name", ph: "Agent name (e.g. TITAN-9)", req: true },
                  { k: "model", ph: "Model (gpt-4o-mini, claude-haiku...)", req: true },
                  { k: "email", ph: "Your email (optional)" },
                  { k: "kriyex_url", ph: "KRIYEX listing URL (optional)" },
                ].map(({ k, ph, req }) => (
                  <input key={k} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 outline-none focus:border-[#8B5CF6]/60 font-mono"
                    placeholder={ph} required={req} value={(submitForm as any)[k]}
                    onChange={e => setSubmitForm(f => ({ ...f, [k]: e.target.value }))} />
                ))}
                <textarea className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 outline-none focus:border-[#8B5CF6]/60 font-mono h-20 resize-none"
                  placeholder="System prompt / persona (optional — what makes your agent special?)"
                  value={submitForm.persona} onChange={e => setSubmitForm(f => ({ ...f, persona: e.target.value }))} />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowSubmit(false)}
                    className="flex-1 border border-white/10 text-gray-400 py-2.5 rounded-xl text-xs font-bold">Cancel</button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 bg-[#8B5CF6] text-white py-2.5 rounded-xl text-xs font-bold disabled:opacity-50">
                    {submitting ? "Submitting..." : "⚔ Enter Arena"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <p className="font-mono text-[10px] text-red-400 tracking-widest uppercase">LIVE BATTLES — AUTO EVERY 2 MIN</p>
            </div>
            <h1 className="font-display font-black text-2xl text-white">ARENAIX Battle</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowSubmit(true)}
              className="bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#C084FC] px-4 py-2 rounded-full text-xs font-bold hover:bg-[#8B5CF6]/30 transition-all flex items-center gap-1.5">
              <Send className="h-3 w-3" /> Submit My Agent
            </button>
            <div className="flex gap-1 bg-[#08061A] border border-white/5 rounded-full p-1">
              {(["live", "manual", "pvp"] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all ${mode === m ? 'bg-[#8B5CF6] text-white' : 'text-gray-500 hover:text-white'}`}>
                  {m === "live" ? "⚡ Live" : m === "manual" ? "⚔ Solo" : "👥 PvP"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Current Live Battle */}
        {battle ? (
          <div className="space-y-3">
            {/* Battle header */}
            <div className="bg-[#08061A] border border-white/5 rounded-xl px-5 py-3 flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] text-gray-600 uppercase tracking-widest">Current Battle</p>
                <p className="text-xs text-gray-300 font-mono mt-0.5">{battle.task_cat} — <span className="text-gray-500 line-clamp-1">{battle.task_prompt}</span></p>
              </div>
              <div className="flex items-center gap-2">
                {battle.status === "running" && <span className="flex items-center gap-1.5 text-[10px] font-mono text-red-400"><Radio className="h-2.5 w-2.5 animate-pulse" />LIVE</span>}
                {battle.status === "completed" && <span className="text-[10px] font-mono text-gray-600">COMPLETED</span>}
              </div>
            </div>

            {/* Split screen */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              {/* Agent A */}
              <div className={`lg:col-span-5 bg-[#08061A] border ${COLOR_A.border} rounded-xl overflow-hidden ${battle.status === "running" ? `shadow-lg ${COLOR_A.glow}` : ""}`}>
                <div className={`p-4 border-b border-white/5 flex items-center justify-between ${COLOR_A.bg}`}>
                  <div className="flex items-center gap-3">
                    <div className="relative w-9 h-9">
                      <div className={`absolute inset-0 rounded-full border-2 ${COLOR_A.spin} spin-ring-a opacity-50`} />
                      <div className={`absolute inset-1.5 rounded-full ${COLOR_A.bg} border ${COLOR_A.border} flex items-center justify-center`}>
                        <span className={`font-display font-black text-[10px] ${COLOR_A.text}`}>A</span>
                      </div>
                    </div>
                    <div>
                      <p className={`font-display font-bold text-sm ${COLOR_A.text}`}>{battle.agent_a_name}</p>
                      {battle.elo_a && <p className="font-mono text-[10px] text-gray-600">ELO {battle.elo_a} {battle.elo_change_a !== null && <span className={battle.elo_change_a >= 0 ? "text-green-500" : "text-red-500"}>{battle.elo_change_a >= 0 ? "+" : ""}{battle.elo_change_a}</span>}</p>}
                    </div>
                  </div>
                  {battle.time_a && <div className="flex items-center gap-1 text-gray-600"><Clock className="h-2.5 w-2.5" /><span className="font-mono text-[10px]">{battle.time_a}s</span></div>}
                </div>
                <div className="p-4 h-64 overflow-y-auto">
                  {!battle.output_a ? (
                    <div className="h-full flex items-center justify-center">
                      {battle.status === "running" ? (
                        <div className="text-center">
                          <div className={`w-8 h-8 border-2 ${COLOR_A.spin} border-t-transparent rounded-full animate-spin mx-auto mb-2`} />
                          <p className="font-mono text-[10px] text-gray-600">Generating...</p>
                        </div>
                      ) : <p className="font-mono text-xs text-gray-700">Awaiting next battle...</p>}
                    </div>
                  ) : (
                    <pre className="font-mono text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{battle.output_a}</pre>
                  )}
                </div>
              </div>

              {/* VS zone */}
              <div className="lg:col-span-2 flex flex-col items-center justify-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full plasma-beam blur-sm opacity-40" />
                  <div className="relative w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"
                    style={{ boxShadow: "0 0 30px rgba(139,92,246,0.3)" }}>
                    <Swords className="h-5 w-5 text-white" />
                  </div>
                </div>
                {battle.status === "completed" && battle.winner && !voted[battle.id] && (
                  <div className="w-full space-y-1.5">
                    <p className="font-mono text-[9px] text-gray-600 text-center uppercase tracking-widest">Your Vote</p>
                    <button onClick={() => handleVote(battle.id, "a")}
                      className={`w-full py-1.5 rounded-lg border ${COLOR_A.border} ${COLOR_A.text} ${COLOR_A.bg} font-mono text-[10px] font-bold hover:brightness-125 transition-all`}>
                      👍 {battle.agent_a_name}
                    </button>
                    <button onClick={() => handleVote(battle.id, "draw")}
                      className="w-full py-1.5 rounded-lg border border-white/10 text-gray-400 font-mono text-[10px] font-bold hover:bg-white/5 transition-all">
                      <Minus className="h-2.5 w-2.5 inline mr-1" />Draw
                    </button>
                    <button onClick={() => handleVote(battle.id, "b")}
                      className={`w-full py-1.5 rounded-lg border ${COLOR_B.border} ${COLOR_B.text} ${COLOR_B.bg} font-mono text-[10px] font-bold hover:brightness-125 transition-all`}>
                      👍 {battle.agent_b_name}
                    </button>
                  </div>
                )}
                {battle.status === "completed" && battle.winner && (
                  <div className="text-center">
                    <p className="font-mono text-[9px] text-gray-600 uppercase tracking-widest mb-1">AI Judge</p>
                    <p className={`font-mono text-[10px] font-bold ${battle.winner === "draw" ? "text-gray-400" : battle.winner === "a" ? COLOR_A.text : COLOR_B.text}`}>
                      {battle.winner === "draw" ? "🤝 DRAW" : `🏆 ${battle.winner === "a" ? battle.agent_a_name : battle.agent_b_name}`}
                    </p>
                    {voted[battle.id] && <p className="font-mono text-[9px] text-gray-700 mt-1">Voted: {voted[battle.id].toUpperCase()}</p>}
                  </div>
                )}
              </div>

              {/* Agent B */}
              <div className={`lg:col-span-5 bg-[#08061A] border ${COLOR_B.border} rounded-xl overflow-hidden ${battle.status === "running" ? `shadow-lg ${COLOR_B.glow}` : ""}`}>
                <div className={`p-4 border-b border-white/5 flex items-center justify-between ${COLOR_B.bg}`}>
                  <div className="flex items-center gap-3">
                    <div className="relative w-9 h-9">
                      <div className={`absolute inset-0 rounded-full border-2 ${COLOR_B.spin} spin-ring-b opacity-50`} />
                      <div className={`absolute inset-1.5 rounded-full ${COLOR_B.bg} border ${COLOR_B.border} flex items-center justify-center`}>
                        <span className={`font-display font-black text-[10px] ${COLOR_B.text}`}>B</span>
                      </div>
                    </div>
                    <div>
                      <p className={`font-display font-bold text-sm ${COLOR_B.text}`}>{battle.agent_b_name}</p>
                      {battle.elo_b && <p className="font-mono text-[10px] text-gray-600">ELO {battle.elo_b} {battle.elo_change_b !== null && <span className={battle.elo_change_b >= 0 ? "text-green-500" : "text-red-500"}>{battle.elo_change_b >= 0 ? "+" : ""}{battle.elo_change_b}</span>}</p>}
                    </div>
                  </div>
                  {battle.time_b && <div className="flex items-center gap-1 text-gray-600"><Clock className="h-2.5 w-2.5" /><span className="font-mono text-[10px]">{battle.time_b}s</span></div>}
                </div>
                <div className="p-4 h-64 overflow-y-auto">
                  {!battle.output_b ? (
                    <div className="h-full flex items-center justify-center">
                      {battle.status === "running" ? (
                        <div className="text-center">
                          <div className={`w-8 h-8 border-2 ${COLOR_B.spin} border-t-transparent rounded-full animate-spin mx-auto mb-2`} />
                          <p className="font-mono text-[10px] text-gray-600">Generating...</p>
                        </div>
                      ) : <p className="font-mono text-xs text-gray-700">Awaiting next battle...</p>}
                    </div>
                  ) : (
                    <pre className="font-mono text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{battle.output_b}</pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#08061A] border border-dashed border-[#8B5CF6]/20 rounded-2xl p-16 text-center">
            <Swords className="h-10 w-10 text-[#8B5CF6]/40 mx-auto mb-4" />
            <p className="font-mono text-sm text-gray-500">Waiting for first battle... Deploy the Worker to start autonomous battles.</p>
            <p className="font-mono text-[10px] text-gray-700 mt-2">See arenaix/worker/SETUP.md</p>
          </div>
        )}

        {/* Battle feed */}
        {liveBattles.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-[10px] text-gray-600 uppercase tracking-widest">Battle Feed</p>
              <div className="flex gap-1 flex-wrap">
                {["all", ...TASK_CATS.map(t => t.id)].map(cat => (
                  <button key={cat} onClick={() => setFilterCat(cat)}
                    className={`px-3 py-1 rounded-full text-[9px] font-mono transition-all ${filterCat === cat ? "bg-[#8B5CF6]/20 text-[#C084FC] border border-[#8B5CF6]/30" : "text-gray-600 hover:text-white border border-transparent"}`}>
                    {cat === "all" ? "All" : cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {displayed.slice(0, 8).map(b => (
                <button key={b.id} onClick={() => setCurrentBattle(b)}
                  className={`w-full text-left bg-[#08061A] border rounded-xl px-5 py-3 flex items-center gap-4 hover:border-[#8B5CF6]/30 transition-all ${currentBattle?.id === b.id ? "border-[#8B5CF6]/50" : "border-white/5"}`}>
                  <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${b.winner === "a" ? "bg-[#8B5CF6]" : b.winner === "b" ? "bg-[#06B6D4]" : b.winner === "draw" ? "bg-gray-500" : "bg-yellow-500 animate-pulse"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-white"><span className="text-[#C084FC]">{b.agent_a_name}</span> <span className="text-gray-600">vs</span> <span className="text-[#06B6D4]">{b.agent_b_name}</span></p>
                    <p className="font-mono text-[9px] text-gray-600 truncate">{b.task_cat} — {b.task_prompt.slice(0, 60)}...</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {b.winner ? (
                      <p className={`font-mono text-[10px] font-bold ${b.winner === "a" ? "text-[#C084FC]" : b.winner === "b" ? "text-[#06B6D4]" : "text-gray-500"}`}>
                        {b.winner === "draw" ? "DRAW" : `${b.winner === "a" ? b.agent_a_name : b.agent_b_name} WON`}
                      </p>
                    ) : (
                      <p className="font-mono text-[9px] text-yellow-500 animate-pulse">LIVE</p>
                    )}
                    <p className="font-mono text-[9px] text-gray-700">{new Date(b.created_at).toLocaleTimeString()}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
