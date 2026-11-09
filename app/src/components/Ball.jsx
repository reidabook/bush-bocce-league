// A bocce ball. Color = team identity (see lib/teamColors). Decorative.
export default function Ball({ color, size = 20, pallino = false, className = '', title }) {
  const style = pallino
    ? {
        width: size, height: size,
        background: 'radial-gradient(circle at 34% 30%, #fff 0 10%, #F4F1E6 40%, #CFC9B6 100%)',
        boxShadow: '0 0 0 1.5px var(--navy)',
      }
    : {
        width: size, height: size,
        background: `radial-gradient(circle at 34% 30%, rgba(255,255,255,.75) 0 7%, rgba(255,255,255,0) 34%), radial-gradient(circle at 50% 58%, ${color} 0 55%, color-mix(in srgb, ${color}, #000 38%) 100%)`,
        boxShadow: 'inset 0 -1px 2px rgba(0,0,0,.25), 0 1px 2px rgba(15,28,61,.25)',
      }
  return (
    <span
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      aria-label={title}
      title={title}
      className={`inline-block rounded-full shrink-0 ${className}`}
      style={style}
    />
  )
}
