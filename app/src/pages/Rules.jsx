export default function Rules() {
  return (
    <div className="space-y-6 pb-4">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1">
          Oakhurst Neighborhood
        </div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2F5E' }}>League Rules</h1>
      </div>

      <Section title="Season">
        <p>April – October</p>
      </Section>

      <Section title="Each Session">
        <ul className="space-y-1">
          <li>Teams are randomized at the start of every session</li>
          <li>Play a few games — rotate who throws within your team</li>
          <li>One team sits out each game and rotates in</li>
        </ul>
      </Section>

      <Section title="Scoring">
        <div className="space-y-3">
          <ScoreRow pts={1} label="Per game played" sub="Everyone on both teams gets 1 point just for playing" />
          <ScoreRow pts={3} label="Per game won" sub="Everyone on the winning team gets 3 additional points" />
          <div className="rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: '#89B4D020', color: '#1B2F5E' }}>
            Win = <strong>4 pts total</strong> · Loss = <strong>1 pt total</strong>
          </div>
        </div>
      </Section>

      <Section title="End of Season">
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <span className="text-xl">🥇</span>
            <div>
              <div className="font-bold text-sm">1st Place</div>
              <div className="text-sm opacity-60">Glory + winner tee shirt</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xl">🥈</span>
            <div>
              <div className="font-bold text-sm">2nd Place</div>
              <div className="text-sm opacity-60">Glory + winner tee shirt</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xl">🥉</span>
            <div>
              <div className="font-bold text-sm">3rd Place</div>
              <div className="text-sm opacity-60">Glory + winner tee shirt</div>
            </div>
          </div>
          <div className="flex items-start gap-3 pt-1">
            <span className="text-xl">🎉</span>
            <div>
              <div className="font-bold text-sm">Everyone Else</div>
              <div className="text-sm opacity-60">Plan and sponsor the end-of-season party</div>
            </div>
          </div>
        </div>
      </Section>

      <Section title="The Vibe">
        <div
          className="rounded-xl p-4 text-white text-sm space-y-1"
          style={{ backgroundColor: '#1B2F5E' }}
        >
          <p>Show up when you can.</p>
          <p>Drink, have fun, and accumulate points.</p>
          <p style={{ color: '#89B4D0' }} className="pt-1 text-xs">It's bush league. That's the point.</p>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="text-xs font-bold uppercase tracking-widest opacity-40 mb-3">{title}</h2>
      <div className="bg-white rounded-xl p-4 shadow-sm text-sm" style={{ color: '#1B2F5E' }}>
        {children}
      </div>
    </div>
  )
}

function ScoreRow({ pts, label, sub }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 text-sm"
        style={{ backgroundColor: '#1B2F5E' }}
      >
        +{pts}
      </div>
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-xs opacity-50 mt-0.5">{sub}</div>
      </div>
    </div>
  )
}
