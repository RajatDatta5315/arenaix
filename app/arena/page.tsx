"use client";
import { useState, useEffect, useRef } from "react";
import { Swords, Play, RefreshCw, ThumbsUp, Minus, Clock, Zap, ChevronDown } from "lucide-react";

const TASK_CATEGORIES = [
  { id: "code",     label: "Code Generation",   icon: "⌨", prompt: "Write a Python function that finds all prime numbers up to N using the Sieve of Eratosthenes. Include type hints and docstring." },
  { id: "writing",  label: "Blog Writing",       icon: "✍", prompt: "Write a compelling 3-paragraph blog post intro about why AI agents will replace traditional SaaS tools by 2027." },
  { id: "email",    label: "Email Drafting",      icon: "📧", prompt: "Write a cold outreach email to a VC firm about investing in an AI agent marketplace. Professional, concise, compelling." },
  { id: "seo",      label: "SEO Title",           icon: "📈", prompt: "Generate 5 high-converting SEO title tags for a blog post about 'AI agents for small businesses'. Include power words and numbers." },
  { id: "sql",      label: "SQL Query",           icon: "🗄", prompt: "Write a SQL query to find the top 10 customers by total revenue in the last 30 days, joining orders and customers tables." },
  { id: "research", label: "Research Synthesis",  icon: "🔬", prompt: "Summarize the key differences between RAG (Retrieval Augmented Generation) and fine-tuning for production AI systems." },
];

const AGENTS = [
  { id: "a1", name: "NEXUS-7",    model: "GPT-4o",        color: "violet", wins: 142, elo: 1847 },
  { id: "a2", name: "CIPHER",     model: "Claude Sonnet", color: "cyan",   wins: 118, elo: 1792 },
  { id: "a3", name: "PHANTOM",    model: "Llama 3.1 70B", color: "green",  wins: 94,  elo: 1654 },
  { id: "a4", name: "VECTOR-X",   model: "Mixtral 8x7B",  color: "gold",   wins: 67,  elo: 1521 },
  { id: "a5", name: "ORACLE",     model: "GPT-4o Mini",   color: "violet", wins: 203, elo: 1923 },
  { id: "a6", name: "STRATOS",    model: "Claude Haiku",  color: "cyan",   wins: 55,  elo: 1489 },
];

const COLOR_MAP: Record<string, { ring: string, glow: string, text: string, bg: string, border: string }> = {
  violet: { ring: "border-arena-violet",   glow: "shadow-arena-violet/60",  text: "text-arena-plasma",  bg: "bg-arena-violet/10", border: "border-arena-violet/30" },
  cyan:   { ring: "border-arena-cyan",     glow: "shadow-arena-cyan/60",    text: "text-arena-cyan",    bg: "bg-arena-cyan/10",   border: "border-arena-cyan/30" },
  green:  { ring: "border-arena-green",    glow: "shadow-arena-green/60",   text: "text-arena-green",   bg: "bg-arena-green/10",  border: "border-arena-green/30" },
  gold:   { ring: "border-arena-gold",     glow: "shadow-arena-gold/60",    text: "text-arena-gold",    bg: "bg-arena-gold/10",   border: "border-arena-gold/30" },
};

type BattleState = "idle" | "selecting" | "countdown" | "battling" | "done";
type VoteResult = "a" | "b" | "draw" | null;

export default function ArenaPage() {
  const [mode, setMode] = useState<"solo"|"pvp">("solo");
  const [task, setTask] = useState(TASK_CATEGORIES[0]);
  const [agentA, setAgentA] = useState(AGENTS[0]);
  const [agentB, setAgentB] = useState(AGENTS[1]);
  const [state, setState] = useState<BattleState>("idle");
  const [countdown, setCountdown] = useState(3);
  const [outputA, setOutputA] = useState("");
  const [outputB, setOutputB] = useState("");
  const [progressA, setProgressA] = useState(0);
  const [progressB, setProgressB] = useState(0);
  const [timeA, setTimeA] = useState(0);
  const [timeB, setTimeB] = useState(0);
  const [vote, setVote] = useState<VoteResult>(null);
  const [showClash, setShowClash] = useState(false);
  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  const MOCK_OUTPUT_A = `
def sieve_of_eratosthenes(n: int) -> list[int]:
    """
    Find all prime numbers up to n using 
    the Sieve of Eratosthenes algorithm.
    
    Args:
        n: Upper bound (inclusive)
    Returns:
        List of prime numbers up to n
    Time: O(n log log n), Space: O(n)
    """
    if n < 2:
        return []
    
    is_prime = bytearray([1]) * (n + 1)
    is_prime[0] = is_prime[1] = 0
    
    for i in range(2, int(n**0.5) + 1):
        if is_prime[i]:
            is_prime[i*i::i] = bytearray(
                len(is_prime[i*i::i])
            )
    
    return [i for i, p in enumerate(is_prime) if p]

# Example usage
primes = sieve_of_eratosthenes(100)
print(f"Found {len(primes)} primes: {primes}")
`.trim();

  const MOCK_OUTPUT_B = `
def sieve_of_eratosthenes(n: int) -> list[int]:
    """Sieve of Eratosthenes prime finder."""
    if n < 2: return []
    primes = list(range(n + 1))
    primes[1] = 0
    for i in range(2, int(n**0.5) + 1):
        if primes[i]:
            for j in range(i*i, n+1, i):
                primes[j] = 0
    return [p for p in primes if p]

# Benchmarks vs alternatives:
# Sieve: O(n log log n) - best for n < 10M
# Trial division: O(n√n) - worse
# Segmented: O(n log log n) - better memory

print(sieve_of_eratosthenes(50))
# [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47]
`.trim();

  const startBattle = () => {
    setState("countdown");
    setCountdown(3);
    setOutputA(""); setOutputB("");
    setProgressA(0); setProgressB(0);
    setTimeA(0); setTimeB(0);
    setVote(null);
    setShowClash(false);
  };

  // Countdown effect
  useEffect(() => {
    if (state !== "countdown") return;
    if (countdown <= 0) {
      setState("battling");
      setShowClash(true);
      startTimeRef.current = Date.now();
      setTimeout(() => setShowClash(false), 800);
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [state, countdown]);

  // Battle simulation
  useEffect(() => {
    if (state !== "battling") return;
    const outputArr = MOCK_OUTPUT_A.split("\n");
    const outputBArr = MOCK_OUTPUT_B.split("\n");
    let lineA = 0, lineB = 0;
    const tick = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setTimeA(elapsed);
      setTimeB(elapsed + Math.random() * 0.3 - 0.15);

      const pA = Math.min(100, Math.round((lineA / outputArr.length) * 100));
      const pB = Math.min(100, Math.round((lineB / outputBArr.length) * 100));
      setProgressA(pA);
      setProgressB(pB);

      if (lineA < outputArr.length) {
        lineA++;
        setOutputA(outputArr.slice(0, lineA).join("\n"));
      }
      if (lineB < outputBArr.length) {
        lineB += Math.random() > 0.4 ? 1 : 2;
        lineB = Math.min(lineB, outputBArr.length);
        setOutputB(outputBArr.slice(0, lineB).join("\n"));
      }

      if (lineA >= outputArr.length && lineB >= outputBArr.length) {
        clearInterval(tick);
        setState("done");
        setTimeA(parseFloat(elapsed.toFixed(2)));
        setTimeB(parseFloat((elapsed + Math.random() * 0.5).toFixed(2)));
      }
    }, 120);
    return () => clearInterval(tick);
  }, [state]);

  const cA = COLOR_MAP[agentA.color];
  const cB = COLOR_MAP[agentB.color];

  return (
    <div className="min-h-screen bg-[#04030A] arena-grid">
      {/* Clash flash overlay */}
      {showClash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="impact-flash w-80 h-80 rounded-full bg-white/10 border-4 border-white/30" />
          <div className="absolute font-display font-black text-6xl text-white" style={{ textShadow: '0 0 60px rgba(255,255,255,0.8)' }}>
            FIGHT!
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] text-arena-violet tracking-widest uppercase mb-1">// battle_arena</p>
            <h1 className="font-display font-black text-2xl text-white">ARENAIX Battle</h1>
          </div>
          {/* Mode toggle */}
          <div className="flex gap-1 bg-arena-panel border border-arena-border rounded-full p-1">
            {(["solo", "pvp"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-4 py-1.5 rounded-full text-xs font-mono font-bold transition-all ${mode === m ? 'bg-arena-violet text-white' : 'text-gray-500 hover:text-white'}`}>
                {m === "solo" ? "⚔ Solo" : "👥 PvP"}
              </button>
            ))}
          </div>
        </div>

        {/* Task selector */}
        <div className="bg-arena-panel border border-arena-border rounded-xl p-4">
          <p className="font-mono text-[10px] text-arena-violet uppercase tracking-widest mb-3">Select Task Category</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {TASK_CATEGORIES.map(t => (
              <button key={t.id} onClick={() => setTask(t)}
                className={`p-3 rounded-lg border text-left transition-all ${task.id === t.id ? 'border-arena-violet bg-arena-violet/10 text-arena-plasma' : 'border-arena-border text-gray-500 hover:border-arena-violet/30 hover:text-white hover:bg-arena-violet/5'}`}>
                <span className="text-lg block mb-1">{t.icon}</span>
                <span className="font-mono text-[10px] font-medium leading-tight">{t.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 p-3 bg-black/30 rounded-lg border border-white/5">
            <p className="font-mono text-[10px] text-gray-600 mb-1">TASK PROMPT //</p>
            <p className="text-xs text-gray-400 leading-relaxed">{task.prompt}</p>
          </div>
        </div>

        {/* Battle zone */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Agent A */}
          <div className={`lg:col-span-5 bg-arena-panel border ${cA.border} rounded-xl overflow-hidden transition-all ${state === "battling" ? `shadow-lg ${cA.glow}` : ""}`}>
            <div className={`p-4 border-b border-arena-border flex items-center justify-between ${cA.bg}`}>
              <div className="flex items-center gap-3">
                {/* Mini spinner */}
                <div className="relative w-10 h-10">
                  <div className={`absolute inset-0 rounded-full border-2 ${cA.ring} spin-ring-a opacity-60`} />
                  <div className={`absolute inset-1 rounded-full border ${cA.ring} spin-ring-b opacity-40`} />
                  <div className={`absolute inset-2 rounded-full ${cA.bg} flex items-center justify-center`} style={{ boxShadow: state === "battling" ? `0 0 15px currentColor` : 'none' }}>
                    <span className={`font-display font-black text-xs ${cA.text}`}>A</span>
                  </div>
                </div>
                <div>
                  <p className={`font-display font-bold text-sm ${cA.text}`}>{agentA.name}</p>
                  <p className="font-mono text-[10px] text-gray-600">{agentA.model}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-mono text-xs font-bold ${cA.text}`}>ELO {agentA.elo}</p>
                <p className="font-mono text-[9px] text-gray-600">{agentA.wins}W</p>
              </div>
            </div>

            {/* Progress */}
            <div className="px-4 py-2 border-b border-arena-border flex items-center gap-3">
              <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-150 rounded-full`}
                  style={{ width: `${progressA}%`, background: agentA.color === 'violet' ? '#8B5CF6' : agentA.color === 'cyan' ? '#06B6D4' : agentA.color === 'green' ? '#10B981' : '#F59E0B' }} />
              </div>
              <span className="font-mono text-[10px] text-gray-500 w-8 text-right">{progressA}%</span>
              <div className="flex items-center gap-1 text-gray-600">
                <Clock className="h-2.5 w-2.5" />
                <span className="font-mono text-[10px]">{timeA.toFixed(1)}s</span>
              </div>
            </div>

            {/* Output */}
            <div className="p-4 h-72 overflow-y-auto">
              {state === "idle" && (
                <div className="h-full flex items-center justify-center">
                  <p className="font-mono text-xs text-gray-700">Awaiting battle start...</p>
                </div>
              )}
              {state === "countdown" && (
                <div className="h-full flex items-center justify-center">
                  <p className="font-display font-black text-6xl text-white animate-pulse">{countdown}</p>
                </div>
              )}
              {(state === "battling" || state === "done") && outputA && (
                <pre className="font-mono text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{outputA}
                  {state === "battling" && <span className="animate-blink text-arena-violet">▌</span>}
                </pre>
              )}
            </div>
          </div>

          {/* VS Center */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center gap-4">
            {state === "idle" && (
              <button onClick={startBattle}
                className="w-full lg:w-auto bg-arena-violet text-white px-6 py-4 rounded-2xl font-black text-sm hover:bg-arena-plasma transition-all shadow-[0_0_30px_rgba(139,92,246,0.4)] flex items-center justify-center gap-2">
                <Play className="h-4 w-4" />
                START
              </button>
            )}
            {state === "countdown" && (
              <div className="w-16 h-16 rounded-full border-2 border-arena-violet/50 flex items-center justify-center">
                <span className="font-display font-black text-3xl text-arena-violet animate-pulse">{countdown}</span>
              </div>
            )}
            {state === "battling" && (
              <div className="flex flex-col items-center gap-2">
                <div className="relative w-12 h-12 rounded-full plasma-beam flex items-center justify-center">
                  <Swords className="h-5 w-5 text-white" />
                </div>
                <p className="font-mono text-[9px] text-arena-violet uppercase tracking-widest animate-pulse">LIVE</p>
              </div>
            )}
            {state === "done" && !vote && (
              <div className="w-full space-y-2">
                <p className="font-mono text-[9px] text-gray-500 text-center uppercase tracking-widest mb-3">Vote Winner</p>
                <button onClick={() => setVote("a")}
                  className={`w-full py-2 rounded-lg border ${cA.border} ${cA.text} ${cA.bg} font-mono text-xs font-bold hover:brightness-125 transition-all flex items-center justify-center gap-1.5`}>
                  <ThumbsUp className="h-3 w-3" /> {agentA.name}
                </button>
                <button onClick={() => setVote("draw")}
                  className="w-full py-2 rounded-lg border border-white/10 text-gray-400 font-mono text-xs font-bold hover:bg-white/5 transition-all flex items-center justify-center gap-1.5">
                  <Minus className="h-3 w-3" /> Draw
                </button>
                <button onClick={() => setVote("b")}
                  className={`w-full py-2 rounded-lg border ${cB.border} ${cB.text} ${cB.bg} font-mono text-xs font-bold hover:brightness-125 transition-all flex items-center justify-center gap-1.5`}>
                  <ThumbsUp className="h-3 w-3" /> {agentB.name}
                </button>
              </div>
            )}
            {vote && (
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-arena-gold/20 border border-arena-gold/40 flex items-center justify-center mx-auto">
                  <span className="text-xl">🏆</span>
                </div>
                <p className="font-mono text-[10px] text-arena-gold uppercase tracking-widest">
                  {vote === "draw" ? "DRAW!" : `${vote === "a" ? agentA.name : agentB.name} WINS`}
                </p>
                <button onClick={() => { setState("idle"); setVote(null); }}
                  className="w-full border border-arena-border text-gray-400 py-2 rounded-lg font-mono text-xs hover:border-arena-violet/30 hover:text-white transition-all flex items-center justify-center gap-1.5">
                  <RefreshCw className="h-3 w-3" /> Rematch
                </button>
              </div>
            )}
          </div>

          {/* Agent B */}
          <div className={`lg:col-span-5 bg-arena-panel border ${cB.border} rounded-xl overflow-hidden transition-all ${state === "battling" ? `shadow-lg ${cB.glow}` : ""}`}>
            <div className={`p-4 border-b border-arena-border flex items-center justify-between ${cB.bg}`}>
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10">
                  <div className={`absolute inset-0 rounded-full border-2 ${cB.ring} spin-ring-b opacity-60`} />
                  <div className={`absolute inset-1 rounded-full border ${cB.ring} spin-ring-a opacity-40`} />
                  <div className={`absolute inset-2 rounded-full ${cB.bg} flex items-center justify-center`}>
                    <span className={`font-display font-black text-xs ${cB.text}`}>B</span>
                  </div>
                </div>
                <div>
                  <p className={`font-display font-bold text-sm ${cB.text}`}>{agentB.name}</p>
                  <p className="font-mono text-[10px] text-gray-600">{agentB.model}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-mono text-xs font-bold ${cB.text}`}>ELO {agentB.elo}</p>
                <p className="font-mono text-[9px] text-gray-600">{agentB.wins}W</p>
              </div>
            </div>

            <div className="px-4 py-2 border-b border-arena-border flex items-center gap-3">
              <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full transition-all duration-150 rounded-full"
                  style={{ width: `${progressB}%`, background: agentB.color === 'cyan' ? '#06B6D4' : agentB.color === 'violet' ? '#8B5CF6' : agentB.color === 'green' ? '#10B981' : '#F59E0B' }} />
              </div>
              <span className="font-mono text-[10px] text-gray-500 w-8 text-right">{progressB}%</span>
              <div className="flex items-center gap-1 text-gray-600">
                <Clock className="h-2.5 w-2.5" />
                <span className="font-mono text-[10px]">{timeB.toFixed(1)}s</span>
              </div>
            </div>

            <div className="p-4 h-72 overflow-y-auto">
              {state === "idle" && (
                <div className="h-full flex items-center justify-center">
                  <p className="font-mono text-xs text-gray-700">Awaiting battle start...</p>
                </div>
              )}
              {state === "countdown" && (
                <div className="h-full flex items-center justify-center">
                  <p className="font-display font-black text-6xl text-white animate-pulse">{countdown}</p>
                </div>
              )}
              {(state === "battling" || state === "done") && outputB && (
                <pre className="font-mono text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{outputB}
                  {state === "battling" && <span className="animate-blink text-arena-cyan">▌</span>}
                </pre>
              )}
            </div>
          </div>
        </div>

        {/* Agent selector row */}
        {state === "idle" && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {AGENTS.map((agent, i) => {
              const isA = agentA.id === agent.id;
              const isB = agentB.id === agent.id;
              const c = COLOR_MAP[agent.color];
              return (
                <button key={agent.id}
                  onClick={() => { if (i < 3) setAgentA(agent); else setAgentB(agent); }}
                  className={`p-3 rounded-xl border transition-all text-left ${
                    isA ? `${c.border} ${c.bg}` : isB ? `${c.border} ${c.bg}` : 'border-arena-border hover:border-arena-violet/30 hover:bg-arena-violet/5'
                  }`}>
                  <p className={`font-display font-bold text-xs mb-0.5 ${isA || isB ? c.text : 'text-white'}`}>{agent.name}</p>
                  <p className="font-mono text-[9px] text-gray-600">{agent.model}</p>
                  <p className={`font-mono text-[9px] mt-1 ${isA ? cA.text : isB ? cB.text : 'text-gray-600'}`}>ELO {agent.elo}</p>
                  {isA && <span className="font-mono text-[8px] text-arena-plasma">AGENT A</span>}
                  {isB && <span className={`font-mono text-[8px] ${cB.text}`}>AGENT B</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
