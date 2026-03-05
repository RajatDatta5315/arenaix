"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Swords, Trophy, Zap, LayoutGrid } from "lucide-react";

const links = [
  { href: "/arena",       label: "Arena",       icon: Swords },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/tasks",       label: "Tasks",       icon: Zap },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled ? "bg-[#04030A]/85 border-b border-arena-border backdrop-blur-2xl" : "bg-transparent"
    }`}>
      <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-arena-violet/20 border border-arena-violet/40 flex items-center justify-center">
            <Swords className="h-3.5 w-3.5 text-arena-violet" />
          </div>
          <span className="font-display font-black text-base tracking-tight text-white group-hover:text-arena-plasma transition-colors">
            ARENAIX<span className="text-arena-violet">.</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/4 transition-all">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link href="/arena" className="bg-arena-violet text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-arena-plasma transition-all shadow-lg shadow-arena-violet/20">
            ⚔ Battle Now
          </Link>
        </div>
      </div>
    </nav>
  );
}
