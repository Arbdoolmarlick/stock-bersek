export function Spinner({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      className="spinner-arc"
      role="progressbar"
      aria-label="Loading"
    >
      <circle
        cx="22"
        cy="22"
        r="18"
        fill="none"
        stroke="var(--color-border)"
        strokeWidth="3"
        opacity="0.6"
      />
      <circle
        cx="22"
        cy="22"
        r="18"
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="34 79"
      />
    </svg>
  );
}
