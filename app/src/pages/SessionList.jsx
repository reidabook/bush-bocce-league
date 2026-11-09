import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchSessionsCached } from '../lib/useActiveSession'
import { groupSessionsByMonth, dayParts, STATUS_TEXT } from '../lib/sessionGroups'
import { PageTitle, SectionLabel, Card, Pill, EmptyState, SkeletonList, Icon } from '../components/ui'
import ErrorState from '../components/ErrorState'

export default function SessionList() {
  const [sessions, setSessions] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchSessionsCached({ force: true }).then(setSessions).catch((e) => setError(e.message))
  }, [])

  if (error) return <ErrorState title="Couldn't load sessions" error={error} />

  return (
    <div className="space-y-4">
      <PageTitle title="Sessions">
        {sessions && <span className="text-[13px] text-muted pb-0.5">{sessions.length} sessions</span>}
      </PageTitle>

      {!sessions ? (
        <SkeletonList rows={5} height={64} />
      ) : sessions.length === 0 ? (
        <EmptyState title="No sessions yet">The commissioner starts one on game night.</EmptyState>
      ) : (
        groupSessionsByMonth(sessions).map((g) => (
          <section key={g.key}>
            <SectionLabel>{g.label}</SectionLabel>
            <Card className="overflow-hidden">
              <ul>
                {g.sessions.map((s) => {
                  const { day, dow } = dayParts(s.date)
                  const live = s.status === 'active'
                  return (
                    <li key={s.id} className="border-t border-hair first:border-t-0">
                      <Link to={live ? '/tonight' : `/sessions/${s.id}`} className="flex items-center gap-3.5 px-3.5 py-2.5 min-h-[60px]">
                        <div className="w-10 flex flex-col items-center leading-none">
                          <span className="font-display font-black text-[28px] text-brand tabular">{day}</span>
                          <span className="text-[11px] font-bold tracking-[.08em] text-muted">{dow}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base">Session {s.session_number}</div>
                          {!live && <div className="text-[13px] text-muted">{STATUS_TEXT[s.status] ?? s.status}</div>}
                        </div>
                        {live && <Pill>Live</Pill>}
                        <Icon name="chevron" size={18} className="text-muted" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </Card>
          </section>
        ))
      )}
    </div>
  )
}
