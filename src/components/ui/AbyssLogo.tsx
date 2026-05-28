interface AbyssLogoProps { size?: number; className?: string }
export function AbyssLogo({ size = 32, className }: AbyssLogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" fill="#0d0d0d" stroke="#00b4ff" strokeWidth="4" />
      <circle cx="50" cy="50" r="22" fill="none" stroke="#00b4ff" strokeWidth="3" />
      <circle cx="50" cy="50" r="8" fill="#00b4ff" />
    </svg>
  )
}
