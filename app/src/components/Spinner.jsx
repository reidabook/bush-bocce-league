export default function Spinner({ label = 'Loading' }) {
  return (
    <div className="flex justify-center py-16" role="status" aria-label={label}>
      <div className="w-7 h-7 rounded-full border-[2.5px] border-line border-t-sky animate-spin" />
    </div>
  )
}
