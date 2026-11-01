import React, { useEffect, useState } from "react";
import { ArrowUpRight, Globe2, RefreshCw, Newspaper } from "lucide-react";

type Article = { title: string; link: string; source: string; publishedAt: string; description: string; image?: string };
const dateLabel = (date: string) => {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
};

// Editorial weather photographs are illustrative, not photos of the reported event.
const weatherPhoto = (title: string) => {
  const t = title.toLowerCase();
  if (/hurricane|cyclone|typhoon|storm|tornado/.test(t)) return "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=1000&auto=format&fit=crop&q=80";
  if (/flood|rain|monsoon/.test(t)) return "https://images.unsplash.com/photo-1519692933481-e162a57d6721?w=1000&auto=format&fit=crop&q=80";
  if (/snow|blizzard|winter|ice/.test(t)) return "https://images.unsplash.com/photo-1483664852095-d6cc6870702d?w=1000&auto=format&fit=crop&q=80";
  if (/heat|drought|wildfire|fire/.test(t)) return "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1000&auto=format&fit=crop&q=80";
  return "https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=1000&auto=format&fit=crop&q=80";
};

export function WorldwideWeatherNews() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/news/weather");
      if (!response.ok) throw new Error("Weather news is temporarily unavailable.");
      const data = await response.json();
      if (!Array.isArray(data.articles)) throw new Error("Unexpected news response.");
      setArticles(data.articles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load news.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void refresh(); }, []);

  const articleCard = (article: Article, featured = false) => (
    <a key={article.link} href={article.link} target="_blank" rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-xl border border-[#30353D] light:border-slate-200 bg-[#171C23] light:bg-white hover:border-[#8ECAE6]/60 transition-colors">
      <div className="relative">
        <img src={article.image || weatherPhoto(article.title)} alt={article.image ? "News article image" : "Illustrative weather photograph"} loading={featured ? "eager" : "lazy"} referrerPolicy="no-referrer"
          onError={(event) => { const img = event.currentTarget; const fallback = weatherPhoto(article.title); if (img.src !== fallback) img.src = fallback; else img.style.display = "none"; }}
          className={`w-full object-cover bg-[#254554] ${featured ? "h-56 sm:h-72" : "h-40"}`} />
        {!article.image && <span className="absolute bottom-2 right-2 rounded bg-black/65 px-2 py-1 text-[10px] text-white">Illustrative image</span>}
      </div>
      <div className={`flex-1 flex flex-col ${featured ? "p-5 sm:p-6" : "p-4"}`}>
        <div className="text-[11px] text-[#8ECAE6] light:text-sky-700 font-semibold mb-2">{article.source} <span className="text-slate-400 font-normal">· {dateLabel(article.publishedAt)}</span></div>
        <h3 className={`font-bold leading-snug text-slate-100 light:text-slate-900 group-hover:text-[#8ECAE6] transition-colors ${featured ? "text-xl sm:text-2xl" : "text-sm sm:text-base"}`}>{article.title}</h3>
        {article.description && <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-400 light:text-slate-600 line-clamp-3">{article.description}</p>}
        <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#8ECAE6] light:text-sky-700">Read original story <ArrowUpRight className="w-3.5 h-3.5" /></span>
      </div>
    </a>
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30353D] light:border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-[#8ECAE6] light:text-sky-700 text-xs font-bold uppercase tracking-widest mb-2"><Globe2 className="w-4 h-4" /> Worldwide coverage</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 light:text-slate-900 tracking-tight">Weather News</h1>
          <p className="mt-1 text-sm text-slate-400 light:text-slate-600">Latest weather headlines from around the world.</p>
        </div>
        <button onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#30353D] light:border-slate-300 text-xs text-slate-200 light:text-slate-700 hover:bg-slate-700/30 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>
      {loading ? <div className="py-20 text-center text-slate-400">Loading worldwide weather headlines…</div>
        : error ? <div role="alert" className="rounded-xl border border-rose-500/30 p-6 text-sm text-rose-300">{error} <button className="underline ml-2" onClick={() => void refresh()}>Try again</button></div>
        : articles.length === 0 ? <div className="py-20 text-center text-slate-400"><Newspaper className="w-8 h-8 mx-auto mb-3" />No weather stories available right now.</div>
        : <>
          <div>{articleCard(articles[0], true)}</div>
          {articles.length > 1 && <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{articles.slice(1).map(article => articleCard(article))}</div>}
        </>}
      <p className="text-[11px] text-slate-500 light:text-slate-500">Headlines are aggregated from external publishers. Open a story to read it at its original source.</p>
    </section>
  );
}
