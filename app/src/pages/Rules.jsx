import { PageTitle, SectionLabel, Card } from '../components/ui'
import { Ridge } from '../components/Layout'

export default function Rules() {
  return (
    <div className="space-y-5 pb-2">
      <PageTitle title="Rules" meta="Oakhurst · April – October" />

      <section>
        <SectionLabel>Scoring</SectionLabel>
        <Card className="overflow-hidden">
          <ScoreRow pts="+1" label="Every game you play" sub="Everyone on both teams." />
          <ScoreRow pts="+3" label="Every game you win" sub="On top of the +1." />
          <div className="flex border-t border-hair">
            <Total big="4" label="Win" />
            <Total big="1" label="Loss" />
            <Total big="0" label="Sat out" />
          </div>
        </Card>
      </section>

      <section>
        <SectionLabel>Each session</SectionLabel>
        <Card className="p-4">
          <ul className="space-y-2 text-[15px] leading-snug list-disc pl-5 marker:text-sky">
            <li>Teams are drawn fresh every session.</li>
            <li>Play a few games — rotate who throws within your team.</li>
            <li>With 3+ teams, one sits out each game and rotates in.</li>
            <li>Leave early or miss a game? You just don't score for it.</li>
          </ul>
        </Card>
      </section>

      <section>
        <SectionLabel>The vibe</SectionLabel>
        <div className="relative rounded-2xl overflow-hidden text-white px-4 pt-5 pb-9" style={{ backgroundColor: 'var(--navy)' }}>
          <p className="font-display font-black text-[28px] leading-[1.05]">Show up when you can.<br />Drink, have fun, rack up points.</p>
          <p className="text-sky text-sm mt-2">It's bush league. That's the point.</p>
          <Ridge />
        </div>
      </section>
    </div>
  )
}

function ScoreRow({ pts, label, sub }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-t border-hair first:border-t-0">
      <span className="font-display font-black text-[36px] leading-none text-brand w-14 tabular">{pts}</span>
      <div>
        <div className="font-semibold text-base">{label}</div>
        <div className="text-[13px] text-muted">{sub}</div>
      </div>
    </div>
  )
}

function Total({ big, label }) {
  return (
    <div className="flex-1 flex flex-col items-center py-3 border-l border-hair first:border-l-0">
      <span className="font-display font-black text-2xl text-brand leading-none">{big}</span>
      <span className="text-[11px] font-bold tracking-[.12em] uppercase text-muted mt-1">{label}</span>
    </div>
  )
}
