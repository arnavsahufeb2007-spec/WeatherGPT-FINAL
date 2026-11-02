import React, { useState, useEffect } from "react";
import { LocationInfo } from "../types.js";
import { searchLocationsAPI } from "../services/api.js";
import { getTranslations } from "../translations/registry.js";
import {
  Search,
  MapPin,
  X,
  Globe,
  Clock,
  Compass,
  AlertTriangle,
  RotateCcw,
  Loader2,
  HelpCircle,
} from "lucide-react";

interface LocationSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (loc: LocationInfo) => void;
  preferredLanguage?: string;
}

const EXAMPLE_SEARCH_QUERIES = [
  "Tokyo, Japan",
  "London, Canada",
  "Paris, Texas",
  "Mumbai, India",
  "New York, US",
  "Berlin, Germany",
  "Sydney, Australia",
  "90210",
];

export function LocationSearchDialog({ isOpen, onClose, onSelectLocation, preferredLanguage }: LocationSearchDialogProps) {
  const t = getTranslations(preferredLanguage);
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<LocationInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced dynamic search against Open-Meteo Geocoding API with race condition protection
  useEffect(() => {
    let isActive = true;
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    const timer = setTimeout(async () => {
      try {
        const data = await searchLocationsAPI(trimmed, 10);
        if (isActive) {
          setResults(data);
        }
      } catch (err: any) {
        if (isActive) {
          console.error("Open-Meteo geocoding search failed:", err);
          setSearchError(err.message || "Failed to search locations. Please check connection.");
        }
      } finally {
        if (isActive) {
          setIsSearching(false);
        }
      }
    }, 120);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  const handleImmediateSearch = async () => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      const data = await searchLocationsAPI(trimmed, 10);
      setResults(data);
      if (data.length > 0) {
        onSelectLocation(data[0]);
        onClose();
      }
    } catch (err: any) {
      setSearchError(err.message || "Failed to search locations. Please check connection.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleRetry = async () => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      const data = await searchLocationsAPI(trimmed, 10);
      setResults(data);
    } catch (err: any) {
      setSearchError(err.message || "Failed to search locations. Please check connection.");
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="location-search-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F141B]/80 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-[8px] bg-[#171C23] border border-[#30353D] shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header Search Bar */}
        <div className="p-3.5 border-b border-[#30353D] flex items-center gap-3 bg-[#171C23]">
          <Search className="w-4 h-4 text-[#8ECAE6] shrink-0" />
          <input
            id="location-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (results.length > 0) {
                  onSelectLocation(results[0]);
                  onClose();
                } else if (searchTerm.trim() && !isSearching) {
                  handleImmediateSearch();
                }
              }
            }}
            placeholder={t.searchDialogPlaceholder || "Search any city, town, state, or postal code worldwide..."}
            autoFocus
            className="min-w-0 flex-1 bg-transparent text-slate-100 text-sm focus:outline-none placeholder-slate-500 font-medium"
          />
          {searchTerm && (
            <button
              id="clear-search-btn"
              onClick={() => setSearchTerm("")}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-[3px] transition-colors cursor-pointer"
              title={t.cancel || "Clear search"}
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            id="close-search-dialog-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-xs font-mono px-2 py-0.5 rounded-[4px] bg-[#252A32] border border-[#30353D] hover:border-[#8ECAE6]/40 transition-colors cursor-pointer"
          >
            {t.close || "Esc"}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Loading State */}
          {isSearching && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-5 h-5 text-[#8ECAE6] animate-spin" />
              <div className="text-center">
                <p className="text-xs font-medium text-slate-200">{t.searchingLocations || "Searching global geocoding database..."}</p>
                <p className="text-[11px] text-slate-500">Retrieving coordinates & timezone from Open-Meteo</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {!isSearching && searchError && (
            <div className="p-3.5 rounded-[6px] bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-semibold text-rose-200">Geocoding Search Error</h4>
                  <p className="text-xs text-rose-300/80 mt-1">{searchError}</p>
                </div>
              </div>
              <button
                onClick={handleRetry}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-medium transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.retry || "Retry Search"}</span>
              </button>
            </div>
          )}

          {/* Results State (Multiple matches) */}
          {!isSearching && !searchError && results.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Matching Locations ({results.length})
                </span>
                <span className="text-[11px] text-slate-500">Select your intended place</span>
              </div>
              <div className="space-y-1.5">
                {results.map((loc, i) => (
                  <button
                    key={`${loc.name}-${loc.latitude}-${loc.longitude}-${i}`}
                    id={`location-result-${i}`}
                    onClick={() => {
                      onSelectLocation(loc);
                      onClose();
                    }}
                    className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-[6px] bg-[#1B2027] hover:bg-[#252A32] border border-[#30353D] hover:border-[#8ECAE6]/50 text-left transition-colors group cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-[4px] bg-[#252A32] border border-[#30353D] flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-[#8ECAE6]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-100 group-hover:text-[#8ECAE6] transition-colors">
                            {loc.name}
                          </span>
                          {loc.countryCode && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-[3px] bg-[#252A32] text-[#8ECAE6] border border-[#30353D]">
                              {loc.countryCode}
                            </span>
                          )}
                          {loc.featureCode === "ADM1" && (
                            <span className="text-[10px] font-sans px-1.5 py-0.2 rounded-[3px] bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              State / Region
                            </span>
                          )}
                        </div>

                        {/* Region / State / Country details */}
                        <p className="text-xs text-slate-400 mt-0.5">
                          {[loc.admin2, loc.admin1, loc.country].filter(Boolean).join(", ")}
                        </p>

                        {/* Additional details: Postcodes / Elevation */}
                        {loc.postcodes && loc.postcodes.length > 0 && (
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Postal: {loc.postcodes.slice(0, 3).join(", ")}
                            {loc.postcodes.length > 3 ? "..." : ""}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Coordinates & Timezone details */}
                    <div className="mt-2 sm:mt-0 sm:text-right flex sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-1 shrink-0 pl-10 sm:pl-0">
                      <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                        <Compass className="w-3 h-3 text-[#8ECAE6]" />
                        <span>
                          {loc.latitude >= 0 ? `${loc.latitude.toFixed(2)}°N` : `${Math.abs(loc.latitude).toFixed(2)}°S`},{" "}
                          {loc.longitude >= 0 ? `${loc.longitude.toFixed(2)}°E` : `${Math.abs(loc.longitude).toFixed(2)}°W`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span className="truncate max-w-[130px]">{loc.timezone || "UTC"}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty Search Results State */}
          {!isSearching && !searchError && searchTerm.trim() && results.length === 0 && (
            <div className="py-10 px-4 text-center space-y-3">
              <div className="w-10 h-10 rounded-[6px] bg-[#1B2027] border border-[#30353D] flex items-center justify-center mx-auto text-slate-400">
                <Globe className="w-5 h-5 text-slate-500" />
              </div>
              <h4 className="text-sm font-semibold text-slate-200">{t.noLocationsFound || "No matching locations found"}</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                We couldn&apos;t find any place matching &ldquo;{searchTerm}&rdquo;. Try searching with a city name, postal
                code, or &ldquo;City, State/Country&rdquo; (e.g. &ldquo;Paris, Texas&rdquo; or &ldquo;London, Canada&rdquo;).
              </p>
            </div>
          )}

          {/* Idle Initial State (Worldwide Search Prompt & Suggested Queries) */}
          {!isSearching && !searchError && !searchTerm.trim() && (
            <div className="py-2 space-y-4">
              <div className="p-3 rounded-[6px] bg-[#1B2027] border border-[#30353D] flex items-start gap-3">
                <HelpCircle className="w-4 h-4 text-[#8ECAE6] shrink-0 mt-0.5" />
                <div className="text-xs text-slate-400 leading-relaxed">
                  <p className="text-slate-200 font-semibold mb-0.5">{t.searchDialogTitle || "Real-time Global Location Search"}</p>
                  Search for any city, town, state, region, or postal code worldwide. Multiple matching results will be
                  returned dynamically from the Open-Meteo Geocoding API.
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  {t.popularSearches || "Try searching"}
                </span>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_SEARCH_QUERIES.map((example) => (
                    <button
                      key={example}
                      onClick={() => setSearchTerm(example)}
                      className="px-2.5 py-1 rounded-[4px] bg-[#1B2027] hover:bg-[#252A32] border border-[#30353D] hover:border-[#8ECAE6]/40 text-xs text-slate-300 hover:text-slate-100 transition-colors cursor-pointer"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#30353D] bg-[#171C23] flex items-center justify-between text-[11px] text-slate-400">
          <span>Powered by Open-Meteo Geocoding API</span>
          <span>Dynamic worldwide resolution</span>
        </div>
      </div>
    </div>
  );
}
