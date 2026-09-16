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

interface HistoryViewProps {
  currentUser: UserProfile | null;
  activeConversationId: string | null;
  onSelectConversation: (conversation: ConversationRecord) => void;
  onNewChat: () => void;
  onRequestAuth: () => void;
}

export function HistoryView({
  currentUser,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onRequestAuth,
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
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-200">
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto">
            <History className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">Cloud Conversation History</h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Sign in with Google to enable cloud synchronization. Your weather queries, route analyses, and forecast chats will be preserved securely with PostgreSQL Row Level Security (RLS).
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <button
              onClick={onRequestAuth}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In with Google</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Weather Chat History</h1>
              <p className="text-xs text-slate-400">
                Synchronized cloud sessions • PostgreSQL Row Level Security
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNewChat}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs shadow-md shadow-sky-500/20 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Chat</span>
          </button>

          {conversations.length > 0 && !confirmClearAll && (
            <button
              type="button"
              onClick={() => setConfirmClearAll(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700/80 hover:border-rose-500/30 text-xs font-medium transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}

          {confirmClearAll && (
            <div className="flex items-center gap-2 bg-rose-950/70 border border-rose-500/40 px-3 py-1.5 rounded-xl">
              <span className="text-xs text-rose-200 font-medium">Clear all conversations?</span>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={isClearingAll}
                className="text-xs px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
              >
                {isClearingAll ? "Clearing..." : "Yes, Delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearAll(false)}
                className="text-xs px-2 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
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
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations by title or topic..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/80 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          <span>Search</span>
        </button>
      </form>

      {/* Error state */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
          <p className="text-xs">Loading conversation history...</p>
        </div>
      )}

      {/* Conversation List */}
      {!isLoading && conversations.length === 0 && (
        <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-center space-y-3">
          <MessageSquare className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-white">No Conversations Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? "No conversations match your search query. Try a different search term."
              : "You haven't started any conversations yet. Start a new weather chat to see it saved here automatically."}
          </p>
          <div className="pt-2">
            <button
              onClick={onNewChat}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Start Weather Chat</span>
            </button>
          </div>
        </div>
      )}

      {!isLoading && conversations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
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
                className={`group p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? "bg-sky-950/30 border-sky-500/50 shadow-lg shadow-sky-500/5"
                    : "bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors line-clamp-1">
                      {conv.title || "Weather Discussion"}
                    </h3>
                    <div className="flex items-center gap-1 shrink-0">
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-500/30 text-sky-300 text-[10px] font-semibold">
                          Active
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, conv.id)}
                        disabled={deletingId === conv.id}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors opacity-80 group-hover:opacity-100 cursor-pointer"
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
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                      <span className="truncate">{conv.location_name}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{updatedDate}</span>
                  </div>
                  <span className="text-sky-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
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
