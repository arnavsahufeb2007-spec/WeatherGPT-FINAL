import React, { useState, useEffect } from "react";
import {
  History,
  Search,
  Trash2,
  ExternalLink,
  MessageSquare,
  MapPin,
  Calendar,
  AlertCircle,
  Loader2,
  PlusCircle,
  LogIn,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { ConversationRecord, LocationInfo } from "../types.js";
import { historyService } from "../services/historyService.js";
import { authService, UserProfile } from "../services/auth.js";
import { isSupabaseConfigured } from "../services/supabase.js";
import { DiurnalPhase, DiurnalPhaseConfig } from "../services/diurnalTheme.js";

interface HistoryViewProps {
  currentUser: UserProfile | null;
  activeConversationId: string | null;
  onSelectConversation: (conversation: ConversationRecord) => void;
  onNewChat: () => void;
  onRequestAuth: () => void;
  diurnalPhase?: DiurnalPhase;
  diurnalConfig?: DiurnalPhaseConfig;
}

export function HistoryView({
  currentUser,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onRequestAuth,
  diurnalPhase,
  diurnalConfig,
}: HistoryViewProps) {
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGuest = !currentUser || currentUser.isGuest;
  const isConfigured = isSupabaseConfigured();

  const loadConversations = async () => {
    if (isGuest || !currentUser) return;
    setIsLoading(true);
    setError(null);
    try {
      const records = await historyService.listConversations(currentUser.id, searchQuery);
      setConversations(records);
    } catch (err: any) {
      setError(err?.message || "Failed to load conversation history.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isGuest) {
      loadConversations();
    }
  }, [currentUser?.id, isGuest]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadConversations();
  };

  const handleDelete = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    if (!currentUser) return;
    if (!window.confirm("Are you sure you want to delete this conversation?")) {
      return;
    }

    setDeletingId(conversationId);
    try {
      const ok = await historyService.deleteConversation(currentUser.id, conversationId);
      if (ok) {
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      }
    } catch (err: any) {
      setError("Could not delete conversation.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!currentUser) return;
    setIsClearingAll(true);
    try {
      const ok = await historyService.clearAllHistory(currentUser.id);
      if (ok) {
        setConversations([]);
        setConfirmClearAll(false);
      }
    } catch (err: any) {
      setError("Could not clear history.");
    } finally {
      setIsClearingAll(false);
    }
  };

  if (isGuest) {
    return (
      <div id="history-view" className="max-w-3xl mx-auto py-6 sm:py-8 px-4 space-y-4 sm:space-y-6 animate-in fade-in duration-200">
        {/* Scenic Hero Banner with Telemetry HUD */}
        <div
          data-atmospheric-banner="true"
          className="hero-atmospheric-card atmospheric-hero-card relative rounded-[8px] bg-[#0F141B] border border-[#30353D] p-5 sm:p-6 overflow-hidden transition-colors shadow-lg"
          style={diurnalConfig ? { borderColor: `${diurnalConfig.accentColor}40` } : undefined}
        >
          <div className="absolute inset-0 z-0 pointer-events-none select-none">
            <img
              key={diurnalConfig?.backgrounds.history.photoUrl || "standard"}
              src={
                diurnalConfig?.backgrounds.history.photoUrl ||
                "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80"
              }
              alt={diurnalConfig?.backgrounds.history.photoAlt || "Atmospheric Mist Valley"}
              className="w-full h-full object-cover object-center opacity-75 dark:opacity-70 transition-opacity duration-700"
            />
            <div
              className="absolute inset-0 transition-colors duration-700"
              style={{
                background: diurnalConfig
                  ? "linear-gradient(90deg, rgba(13,19,26,0.94) 0%, rgba(13,19,26,0.80) 55%, rgba(13,19,26,0.25) 100%)"
                  : "linear-gradient(90deg, rgba(15,20,27,0.95) 0%, rgba(23,28,35,0.90) 60%, rgba(23,28,35,0.40) 100%)",
              }}
            />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-[3px] bg-[#0F141B]/80 border transition-colors"
                  style={{
                    color: diurnalConfig ? diurnalConfig.accentColor : "#8ECAE6",
                    borderColor: diurnalConfig ? `${diurnalConfig.accentColor}40` : "rgba(142, 202, 230, 0.3)",
                  }}
                >
                  CLOUD ARCHIVE • {diurnalConfig ? diurnalConfig.stationTelemetrySub : "POSTGRESQL ROW LEVEL SECURITY"}
                </span>
                {diurnalConfig && (
                  <span
                    className="inline-flex items-center gap-1 text-[9px] font-mono uppercase font-bold px-2 py-0.5 rounded-[4px] backdrop-blur-sm"
                    style={{
                      backgroundColor: `${diurnalConfig.accentColor}25`,
                      color: diurnalConfig.accentColor,
                      border: `1px solid ${diurnalConfig.accentColor}50`,
                    }}
                  >
                    {diurnalConfig.solarStatusBadge}
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-mono tracking-tight">
                Cloud Conversation History
              </h2>
              <p className="text-xs text-slate-200 leading-relaxed">
                Synchronize your meteorological inquiries, route corridor analyses, and forecast dialogues across all your devices securely.
              </p>
            </div>

            {/* Telemetry HUD */}
            <div className="bg-[#0F141B]/85 backdrop-blur-md border border-white/10 p-3 rounded-[6px] hidden sm:flex flex-col gap-1.5 min-w-[210px] text-[11px] font-mono shrink-0 shadow-inner">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] uppercase tracking-wider text-slate-400">VAULT STATE</span>
                <span className="text-slate-300 font-semibold">GUEST MODE</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-[10px] text-slate-400">RLS SECURITY:</span>
                <span className="text-emerald-400 font-semibold">STANDBY</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-[10px] text-slate-400">SYNC PROTOCOL:</span>
                <span className="text-[#8ECAE6] font-semibold">SUPABASE OAUTH</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 rounded-[8px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 text-center space-y-4 transition-colors">
          <div className="w-12 h-12 rounded-[6px] bg-[#1B2027] border border-[#30353D] text-[#8ECAE6] flex items-center justify-center mx-auto">
            <History className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold font-mono tracking-tight text-slate-100 dark:text-slate-100 light:text-slate-900">
              Sign In to Access Cloud Records
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              Sign in with Google to enable cloud synchronization. Your weather queries, route analyses, and forecast chats will be preserved securely with PostgreSQL Row Level Security (RLS).
            </p>
          </div>
          <div className="pt-1.5 flex justify-center">
            <button
              onClick={onRequestAuth}
              className="flex items-center gap-2 px-5 py-2.5 rounded-[4px] bg-[#F4A261] hover:bg-[#E76F51] text-[#0F141B] font-mono font-bold text-xs transition-colors cursor-pointer shadow-sm"
            >
              <LogIn className="w-4 h-4 text-[#0F141B]" />
              <span>Sign In with Google</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="history-view" className="max-w-4xl mx-auto py-4 sm:py-6 px-4 space-y-4 sm:space-y-5 animate-in fade-in duration-200">
      {/* Cloud History Hero Banner with Telemetry HUD */}
      <div
        data-atmospheric-banner="true"
        className="hero-atmospheric-card atmospheric-hero-card relative rounded-[8px] bg-[#0F141B] border border-[#30353D] p-5 sm:p-6 overflow-hidden transition-colors shadow-lg"
        style={diurnalConfig ? { borderColor: `${diurnalConfig.accentColor}40` } : undefined}
      >
        <div className="absolute inset-0 z-0 pointer-events-none select-none">
          <img
            key={diurnalConfig?.backgrounds.history.photoUrl || "standard-auth"}
            src={
              diurnalConfig?.backgrounds.history.photoUrl ||
              "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80"
            }
            alt={diurnalConfig?.backgrounds.history.photoAlt || "Atmospheric Mist Valley"}
            className="w-full h-full object-cover object-center opacity-75 dark:opacity-70 transition-opacity duration-700"
          />
          <div
            className="absolute inset-0 transition-colors duration-700"
            style={{
              background: diurnalConfig
                ? "linear-gradient(90deg, rgba(13,19,26,0.94) 0%, rgba(13,19,26,0.80) 55%, rgba(13,19,26,0.25) 100%)"
                : "linear-gradient(90deg, rgba(15,20,27,0.95) 0%, rgba(23,28,35,0.90) 60%, rgba(23,28,35,0.40) 100%)",
            }}
          />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-[3px] bg-[#0F141B]/80 border transition-colors"
                style={{
                  color: diurnalConfig ? diurnalConfig.accentColor : "#8ECAE6",
                  borderColor: diurnalConfig ? `${diurnalConfig.accentColor}40` : "rgba(142, 202, 230, 0.3)",
                }}
              >
                CLOUD ARCHIVE • {diurnalConfig ? diurnalConfig.stationTelemetrySub : "POSTGRESQL ROW LEVEL SECURITY"}
              </span>
              {diurnalConfig && (
                <span
                  className="inline-flex items-center gap-1 text-[9px] font-mono uppercase font-bold px-2 py-0.5 rounded-[4px] backdrop-blur-sm"
                  style={{
                    backgroundColor: `${diurnalConfig.accentColor}25`,
                    color: diurnalConfig.accentColor,
                    border: `1px solid ${diurnalConfig.accentColor}50`,
                  }}
                >
                  {diurnalConfig.solarStatusBadge}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white font-mono tracking-tight">
              Weather Chat History
            </h2>
            <p className="text-xs text-slate-200 leading-relaxed">
              Synchronized cloud sessions • PostgreSQL Row Level Security encrypted data store.
            </p>
          </div>

          {/* Telemetry HUD */}
          <div className="bg-[#0F141B]/85 backdrop-blur-md border border-white/10 p-3 rounded-[6px] hidden sm:flex flex-col gap-1.5 min-w-[210px] text-[11px] font-mono shrink-0 shadow-inner">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] uppercase tracking-wider text-slate-400">VAULT STATE</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span> SYNCHRONIZED
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-[10px] text-slate-400">ENCRYPTION:</span>
              <span className="text-[#8ECAE6] font-semibold">POSTGRES RLS</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-[10px] text-slate-400">RECORDS:</span>
              <span className="text-slate-200 font-semibold">{conversations.length} SAVED SESSIONS</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-[10px] text-slate-400">USER ID:</span>
              <span className="text-[#F4A261] font-semibold truncate max-w-[110px]">{currentUser?.email || "Authenticated"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Sub-header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[6px] bg-[#1B2027] border border-[#30353D] text-[#8ECAE6]">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-slate-100 dark:text-slate-100 light:text-slate-900 tracking-tight uppercase">
                SAVED CONVERSATIONS
              </h3>
              <p className="text-xs font-mono text-slate-400">
                User: {currentUser?.email || "Authenticated User"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#F4A261] hover:bg-[#E76F51] text-[#0F141B] font-mono font-bold text-xs transition-colors cursor-pointer shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>

          {conversations.length > 0 && !confirmClearAll && (
            <button
              type="button"
              onClick={() => setConfirmClearAll(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#1B2027] hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-[#30353D] hover:border-rose-500/40 text-xs font-mono transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}

          {confirmClearAll && (
            <div className="flex flex-wrap items-center gap-2 bg-rose-950/60 border border-rose-500/40 px-3 py-1.5 rounded-[4px] font-mono">
              <span className="text-xs text-rose-200">Clear all conversations?</span>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={isClearingAll}
                className="text-xs px-2.5 py-0.5 rounded-[3px] bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
              >
                {isClearingAll ? "Clearing..." : "Yes, Delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearAll(false)}
                className="text-xs px-2 py-0.5 rounded-[3px] bg-[#1B2027] border border-[#30353D] text-slate-300 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations by title or topic..."
            className="w-full bg-[#1B2027] border border-[#30353D] focus:border-[#8ECAE6] rounded-[4px] pl-9 pr-4 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="px-3.5 py-2 rounded-[4px] bg-[#1B2027] hover:bg-[#252A32] text-slate-200 text-xs font-mono font-semibold border border-[#30353D] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8ECAE6]" /> : <RefreshCw className="w-3.5 h-3.5" />}
          <span>Search</span>
        </button>
      </form>

      {/* Error state */}
      {error && (
        <div className="p-3 rounded-[6px] bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-400 font-mono">
          <Loader2 className="w-5 h-5 animate-spin text-[#8ECAE6]" />
          <p className="text-xs">Loading conversation history...</p>
        </div>
      )}

      {/* Conversation List */}
      {!isLoading && conversations.length === 0 && (
        <div className="p-8 sm:p-10 rounded-[8px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 text-center space-y-3 transition-colors">
          <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm sm:text-base font-bold font-mono text-slate-100 dark:text-slate-100 light:text-slate-900">
            No Conversations Found
          </h3>
          <p className="text-xs font-mono text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? "No conversations match your search query. Try a different search term."
              : "You haven't started any conversations yet. Start a new weather chat to see it saved here automatically."}
          </p>
          <div className="pt-2">
            <button
              onClick={onNewChat}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] bg-[#252A32] hover:bg-[#30353D] text-[#8ECAE6] border border-[#8ECAE6]/40 text-xs font-mono font-semibold transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Start Weather Chat</span>
            </button>
          </div>
        </div>
      )}

      {!isLoading && conversations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {conversations.map((conv) => {
            const isActive = activeConversationId === conv.id;
            const updatedDate = new Date(conv.updated_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv)}
                className={`group p-3.5 sm:p-4 rounded-[8px] border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? "bg-[#1B2027] border-2 border-[#F4A261] ring-2 ring-[#F4A261]/20 shadow-md"
                    : "bg-[#171C23] dark:bg-[#171C23] light:bg-white border-[#30353D] dark:border-[#30353D] light:border-slate-200 hover:bg-[#1B2027] dark:hover:bg-[#1B2027] light:hover:bg-slate-50 hover:border-[#8ECAE6]/50 shadow-sm"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 group-hover:text-[#8ECAE6] transition-colors line-clamp-1">
                      {conv.title || "Weather Discussion"}
                    </h3>
                    <div className="flex items-center gap-1 shrink-0">
                      {isActive && (
                        <span className="px-1.5 py-0.5 rounded-[3px] bg-[#F4A261] border border-[#F4A261] text-[#0F141B] text-[10px] font-mono font-bold">
                          Active
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, conv.id)}
                        disabled={deletingId === conv.id}
                        className="p-1 rounded-[3px] text-slate-500 hover:text-rose-400 hover:bg-[#252A32] transition-colors opacity-80 group-hover:opacity-100 cursor-pointer"
                        title="Delete conversation"
                      >
                        {deletingId === conv.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {conv.location_name && (
                    <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
                      <MapPin className="w-3 h-3 text-[#8ECAE6] shrink-0" />
                      <span className="truncate">{conv.location_name}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2.5 mt-2.5 border-t border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{updatedDate}</span>
                  </div>
                  <span className="text-[#8ECAE6] font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    Open <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
