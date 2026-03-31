export default function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div
        className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: '#1B2F5E', borderTopColor: 'transparent' }}
      />
    </div>
  )
}
