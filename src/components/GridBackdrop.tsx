export function GridBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <svg className="grid-breathe h-full w-full" role="presentation">
        <defs>
          <pattern id="sb-grid" width="44" height="44" patternUnits="userSpaceOnUse">
            <path d="M44 0H0V44" fill="none" stroke="var(--color-primary)" strokeWidth="1" />
            <circle cx="0" cy="0" r="1.2" fill="var(--color-primary)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#sb-grid)" />
      </svg>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 20%, color-mix(in oklab, var(--color-primary) 14%, transparent), transparent 65%)",
        }}
      />
    </div>
  );
}
