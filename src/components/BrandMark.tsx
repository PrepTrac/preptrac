/** The same stacked-supply P geometry is used by the install icons and favicon. */
export default function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return <svg viewBox="0 0 48 48" className={`shrink-0 ${className}`} aria-hidden="true"><path fill="currentColor" d="M8 6h23l9 9v9l-9 9H18v9H8V30h21l3-3H8V18h24l-3-3H8z" /></svg>;
}
