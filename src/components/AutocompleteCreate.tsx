import { useEffect, useRef, useState } from "react";
import { Check, Plus, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type AutocompleteOption = { id: string; label: string };

interface Props {
  value: string | null;
  options: AutocompleteOption[];
  onSelect: (id: string) => void;
  onCreate: (label: string) => Promise<string>; // returns new id
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
}

export const AutocompleteCreate = ({
  value,
  options,
  onSelect,
  onCreate,
  placeholder = "Search or create...",
  emptyText = "No matches",
  disabled,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selected = options.find((o) => o.id === value);
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(query.toLowerCase())
  );
  const exact = options.find(
    (o) => o.label.toLowerCase() === query.trim().toLowerCase()
  );
  const showCreate = query.trim().length > 0 && !exact;

  const handleCreate = async () => {
    const label = query.trim();
    if (!label) return;
    setCreating(true);
    try {
      const id = await onCreate(label);
      onSelect(id);
      setQuery("");
      setOpen(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="w-full h-10 px-3 rounded-lg bg-surface-sunken border border-border/50 text-sm text-left flex items-center justify-between hover:border-primary/40 transition-colors disabled:opacity-50"
      >
        <span className={cn(!selected && "text-muted-foreground")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg bg-surface-elevated border border-border/50 shadow-2xl overflow-hidden">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && showCreate) {
                e.preventDefault();
                handleCreate();
              }
            }}
            placeholder="Type to search or create..."
            className="w-full h-10 px-3 bg-transparent border-b border-border/50 text-sm focus:outline-none"
          />
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 && !showCreate && (
              <p className="px-3 py-2 text-xs text-muted-foreground">{emptyText}</p>
            )}
            {filtered.map((o) => (
              <button
                type="button"
                key={o.id}
                onClick={() => {
                  onSelect(o.id);
                  setOpen(false);
                  setQuery("");
                }}
                className="w-full px-3 py-2 text-sm text-left hover:bg-primary/10 flex items-center justify-between"
              >
                <span>{o.label}</span>
                {o.id === value && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
            {showCreate && (
              <button
                type="button"
                disabled={creating}
                onClick={handleCreate}
                className="w-full px-3 py-2 text-sm text-left hover:bg-primary/10 flex items-center gap-2 text-primary border-t border-border/50"
              >
                <Plus className="w-4 h-4" />
                Create "{query.trim()}"
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
