export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-mark">
      <div className="brand-symbol" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      {!compact && (
        <div>
          <strong>ĐăkRơSa</strong>
          <small>Hydro Operations</small>
        </div>
      )}
    </div>
  );
}

