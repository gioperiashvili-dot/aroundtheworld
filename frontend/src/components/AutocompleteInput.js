import { useEffect, useId, useMemo, useState } from "react";

export default function AutocompleteInput({
  label,
  value,
  onChange,
  onSelect,
  suggestions,
  placeholder,
  noSuggestionsText,
  minCharacters = 2,
  type = "text",
  inputMode,
  inputRef,
  className = "",
  name,
  disabled = false,
}) {
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const trimmedValue = value.trim();
  const canShowPanel = trimmedValue.length >= minCharacters;
  const visibleSuggestions = useMemo(
    () => (canShowPanel ? suggestions.slice(0, 6) : []),
    [canShowPanel, suggestions]
  );

  useEffect(() => {
    setHighlightedIndex(visibleSuggestions.length > 0 ? 0 : -1);
  }, [visibleSuggestions]);

  const shouldShowPanel = !disabled && isOpen && canShowPanel;

  const handleSelect = (suggestion) => {
    onSelect(suggestion);
    setIsOpen(false);
  };

  return (
    <label className={`relative block text-left ${className}`}>
      {label ? (
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">
          {label}
        </span>
      ) : null}

      <input
        id={inputId}
        name={name}
        type={type}
        ref={inputRef}
        role="combobox"
        inputMode={inputMode}
        value={value}
        disabled={disabled}
        autoComplete="off"
        placeholder={placeholder}
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={shouldShowPanel}
        aria-controls={shouldShowPanel ? listboxId : undefined}
        onFocus={() => {
          if (canShowPanel) {
            setIsOpen(true);
          }
        }}
        onBlur={() => {
          window.setTimeout(() => setIsOpen(false), 120);
        }}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
        }}
        onKeyDown={(event) => {
          if (!canShowPanel || visibleSuggestions.length === 0) {
            if (event.key === "Escape") {
              setIsOpen(false);
            }
            return;
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setIsOpen(true);
            setHighlightedIndex((currentIndex) =>
              currentIndex < visibleSuggestions.length - 1 ? currentIndex + 1 : 0
            );
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            setIsOpen(true);
            setHighlightedIndex((currentIndex) =>
              currentIndex > 0 ? currentIndex - 1 : visibleSuggestions.length - 1
            );
          }

          if (event.key === "Enter" && isOpen && highlightedIndex >= 0) {
            event.preventDefault();
            handleSelect(visibleSuggestions[highlightedIndex]);
          }

          if (event.key === "Escape") {
            setIsOpen(false);
          }
        }}
        className="mt-2 w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-500 dark:text-white dark:placeholder:text-slate-400"
      />

      {shouldShowPanel ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-30 overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-[0_24px_60px_-38px_rgba(15,23,42,0.55)] dark:border-slate-700 dark:bg-slate-900">
          {visibleSuggestions.length > 0 ? (
            <ul id={listboxId} role="listbox" className="max-h-72 overflow-y-auto p-2">
              {visibleSuggestions.map((suggestion, index) => (
                <li key={suggestion.id} role="option" aria-selected={index === highlightedIndex}>
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handleSelect(suggestion);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`flex w-full items-center justify-between gap-4 rounded-[1rem] px-3 py-3 text-left transition ${
                      index === highlightedIndex
                        ? "bg-slate-950 text-white"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span>
                      <span className="block text-sm font-semibold">{suggestion.primary}</span>
                      {suggestion.secondary ? (
                        <span
                          className={`mt-1 block text-xs ${
                            index === highlightedIndex
                              ? "text-white/72"
                              : "text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {suggestion.secondary}
                        </span>
                      ) : null}
                    </span>

                    {suggestion.tag ? (
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                          index === highlightedIndex
                            ? "bg-white/12 text-white"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {suggestion.tag}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">
              {noSuggestionsText}
            </div>
          )}
        </div>
      ) : null}
    </label>
  );
}
