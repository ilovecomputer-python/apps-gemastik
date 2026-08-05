export type SortKey = "popular" | "price-asc" | "price-desc" | "rating";

interface FilterSheetProps {
  open: boolean;
  sortKey: SortKey;
  halalOnly: boolean;
  umkmOnly: boolean;
  onChangeSort: (key: SortKey) => void;
  onToggleHalal: () => void;
  onToggleUmkm: () => void;
  onClose: () => void;
  onReset: () => void;
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "popular", label: "Paling populer" },
  { key: "price-asc", label: "Harga terendah" },
  { key: "price-desc", label: "Harga tertinggi" },
  { key: "rating", label: "Rating tertinggi" },
];

export default function FilterSheet({
  open,
  sortKey,
  halalOnly,
  umkmOnly,
  onChangeSort,
  onToggleHalal,
  onToggleUmkm,
  onClose,
  onReset,
}: FilterSheetProps) {
  if (!open) return null;

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h3 className="sheet-title">Filter & Urutkan</h3>

        <div className="sheet-section">
          <span className="sheet-label">Urutkan</span>
          <div className="sheet-options">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                className={`option-chip${sortKey === opt.key ? " active" : ""}`}
                onClick={() => onChangeSort(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="sheet-section">
          <span className="sheet-label">Preferensi</span>
          <div className="sheet-options">
            <button
              className={`option-chip${halalOnly ? " active" : ""}`}
              onClick={onToggleHalal}
            >
              Halal
            </button>
            <button
              className={`option-chip${umkmOnly ? " active" : ""}`}
              onClick={onToggleUmkm}
            >
              UMKM
            </button>
          </div>
        </div>

        <div className="sheet-actions">
          <button className="btn-secondary" onClick={onReset}>
            Reset
          </button>
          <button className="btn-primary" onClick={onClose}>
            Terapkan
          </button>
        </div>
      </div>
    </div>
  );
}
