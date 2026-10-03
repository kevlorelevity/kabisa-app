/** The yellow "Beta" sticker — on the landing page (large) and in the nav (small). */
export function BetaSticker({ size = 'sm', className = '' }: { size?: 'sm' | 'lg'; className?: string }) {
  return (
    <span
      aria-label="Beta"
      className={`inline-block select-none rounded-md bg-yellow-300 font-black uppercase tracking-widest text-gray-900 shadow-[2px_2px_0_0_rgba(17,24,39,0.85)] border border-gray-900 ${
        size === 'lg' ? 'px-3 py-1 text-sm -rotate-6' : 'px-1.5 py-0.5 text-[10px] -rotate-3'
      } ${className}`}
    >
      Beta
    </span>
  );
}
