import logoUrl from '../../assets/logo.svg'

interface AbyssLogoProps {
  size?: number
  className?: string
  style?: React.CSSProperties
}

export function AbyssLogo({ size = 24, className, style }: AbyssLogoProps) {
  return (
    <img
      src={logoUrl}
      alt="Abyss"
      width={size}
      height={size}
      draggable={false}
      className={className}
      style={{ objectFit: 'contain', userSelect: 'none', ...style }}
    />
  )
}
