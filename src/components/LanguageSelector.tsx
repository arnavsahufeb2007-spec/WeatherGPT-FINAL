import React, { useState, useRef, useEffect } from "react";
import { Globe, Search, Check, ChevronDown, Sparkles } from "lucide-react";
import { ALL_LANGUAGES, INDIAN_LANGUAGES, INTERNATIONAL_LANGUAGES, SPECIAL_LANGUAGES, getLanguageConfig, LanguageDefinition } from "../languages.js";

interface LanguageSelectorProps {
  currentLanguage: string;
  onSelectLanguage: (code: string) => void;
  className?: string;
}

export function LanguageSelector({ currentLanguage, onSelectLanguage, className = "" }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const activeConfig = getLanguageConfig(currentLanguage);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Auto-focus search input when opening
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Filter languages based on search query
  const q = searchQuery.toLowerCase().trim();
  const filterLang = (l: LanguageDefinition) => {
    if (!q) return true;
    return (
      l.name.toLowerCase().includes(q) ||
      l.nativeName.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q) ||
      (l.script && l.script.toLowerCase().includes(q))
    );
  };

  const filteredIndian = INDIAN_LANGUAGES.filter(filterLang);
  const filteredSpecial = SPECIAL_LANGUAGES.filter(filterLang);
  const filteredInternational = INTERNATIONAL_LANGUAGES.filter(filterLang);

  const totalResults = filteredIndian.length + filteredSpecial.length + filteredInternational.length;

  const handleSelect = (code: string) => {
    onSelectLanguage(code);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        id="language-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-200 transition-all focus:outline-none focus:ring-1 focus:ring-sky-500"
        title="Select WeatherGPT Language"
      >
        <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        <span className="font-semibold text-white tracking-wide">{activeConfig.name}</span>
        {activeConfig.nativeName !== activeConfig.name && (
          <span className="text-[11px] text-slate-400 font-normal">({activeConfig.nativeName})</span>
        )}
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-xl bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 shadow-2xl shadow-black/80 z-50 overflow-hidden flex flex-col max-h-[460px] animate-in fade-in zoom-in-95 duration-100">
          {/* Search Header */}
          <div className="p-2.5 border-b border-slate-800 bg-slate-950/60 sticky top-0 z-10">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search languages (e.g., Hindi, বাংলা, te)..."
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 text-[11px] text-slate-400 hover:text-white px-1"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="flex items-center justify-between mt-1.5 px-0.5 text-[10px] text-slate-400">
              <span>{ALL_LANGUAGES.length} Languages supported</span>
              <span className="text-sky-400">Gemini Multilingual</span>
            </div>
          </div>

          {/* Languages List */}
          <div className="overflow-y-auto p-1.5 space-y-3 flex-1 scrollbar-thin scrollbar-thumb-slate-700">
            {totalResults === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No languages match &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              <>
                {/* Special Mode (Hinglish) */}
                {filteredSpecial.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Conversational Indian Dialect</span>
                    </div>
                    <div className="space-y-0.5">
                      {filteredSpecial.map((lang) => {
                        const isSelected = lang.code === currentLanguage;
                        return (
                          <button
                            key={lang.code}
                            type="button"
                            onClick={() => handleSelect(lang.code)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                              isSelected
                                ? "bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30"
                                : "text-slate-200 hover:bg-slate-800"
                            }`}
                          >
                            <div className="flex flex-col">
                              <span className="flex items-center gap-1.5">
                                {lang.name}
                                <span className="text-[10px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-normal">
                                  Roman Script
                                </span>
                              </span>
                              <span className="text-[10px] text-slate-400">Natural Hindi + English blend</span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Indian Languages */}
                {filteredIndian.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center justify-between">
                      <span>Indian Languages</span>
                      <span className="text-slate-500 font-mono text-[9px]">{filteredIndian.length}</span>
                    </div>
                    <div className="space-y-0.5">
                      {filteredIndian.map((lang) => {
                        const isSelected = lang.code === currentLanguage;
                        return (
                          <button
                            key={lang.code}
                            type="button"
                            onClick={() => handleSelect(lang.code)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                              isSelected
                                ? "bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30"
                                : "text-slate-200 hover:bg-slate-800"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>{lang.name}</span>
                              <span className="text-[11px] text-slate-400 font-normal">
                                ({lang.nativeName})
                              </span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* International Languages */}
                {filteredInternational.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center justify-between">
                      <span>International Languages</span>
                      <span className="text-slate-500 font-mono text-[9px]">{filteredInternational.length}</span>
                    </div>
                    <div className="space-y-0.5">
                      {filteredInternational.map((lang) => {
                        const isSelected = lang.code === currentLanguage;
                        return (
                          <button
                            key={lang.code}
                            type="button"
                            onClick={() => handleSelect(lang.code)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                              isSelected
                                ? "bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30"
                                : "text-slate-200 hover:bg-slate-800"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>{lang.name}</span>
                              <span className="text-[11px] text-slate-400 font-normal">
                                ({lang.nativeName})
                              </span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
