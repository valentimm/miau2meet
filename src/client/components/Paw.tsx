export function Paw({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="18" cy="18" r="7" fill="currentColor" />
      <circle cx="32" cy="12" r="7" fill="currentColor" />
      <circle cx="46" cy="18" r="7" fill="currentColor" />
      <circle cx="12" cy="32" r="5.5" fill="currentColor" />
      <path
        d="M23 36c0-8 5.2-13 9-13s9 5 9 13c1 10-3.2 16-9 18-5.8-2-10-8-9-18Z"
        fill="currentColor"
      />
    </svg>
  );
}
