// Small shared loading indicator — used everywhere a screen/panel is
// waiting on its first data fetch. Previously every one of these was plain
// static text ("Loading todos…") with no visual motion at all, which reads
// as a blank/broken flash rather than an intentional loading state.
// animate-spin is neutralized globally by the prefers-reduced-motion rule
// in index.css, so this respects that automatically.
export default function LoadingState({ label }) {
  return (
    <p className="flex items-center gap-2 text-sm text-neutral-500" role="status">
      <svg className="h-3.5 w-3.5 shrink-0 animate-spin text-neutral-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V4a8 8 0 00-8 8H4z" />
      </svg>
      {label}
    </p>
  )
}
