import { createClient } from '@supabase/supabase-js'

const TEAM_COLORS = ['Red', 'Green', 'Blue', 'Yellow', 'Orange', 'Purple', 'Black']

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'add_game',
        description: 'Log a new game between two teams for the current week session.',
        parameters: {
          type: 'object',
          properties: {
            team_a: {
              type: 'string',
              description: 'Exact name of the first team (e.g., "Red Team")',
            },
            team_b: {
              type: 'string',
              description: 'Exact name of the second team (e.g., "Blue Team")',
            },
            notes: {
              type: 'string',
              description: 'Optional notes about the game (e.g., "close game", "tiebreaker")',
            },
          },
          required: ['team_a', 'team_b'],
        },
      },
      {
        name: 'record_result',
        description: 'Record the winner of a game that has already been logged.',
        parameters: {
          type: 'object',
          properties: {
            team_a: { type: 'string', description: 'Name of one team in the game' },
            team_b: { type: 'string', description: 'Name of the other team in the game' },
            winner: { type: 'string', description: 'Exact name of the team that won' },
          },
          required: ['team_a', 'team_b', 'winner'],
        },
      },
      {
        name: 'delete_game',
        description: 'Remove a game that was logged incorrectly.',
        parameters: {
          type: 'object',
          properties: {
            team_a: { type: 'string', description: 'Name of one team in the game' },
            team_b: { type: 'string', description: 'Name of the other team in the game' },
          },
          required: ['team_a', 'team_b'],
        },
      },
      {
        name: 'generate_teams',
        description: 'Randomly generate balanced teams from a list of players and save them for the current week. Only works before any games have been played.',
        parameters: {
          type: 'object',
          properties: {
            players: {
              type: 'array',
              items: { type: 'string' },
              description: 'Names of all players who are available this session',
            },
            num_teams: {
              type: 'integer',
              description: 'Number of teams to create — must be odd (3, 5, or 7)',
            },
          },
          required: ['players', 'num_teams'],
        },
      },
      {
        name: 'log_player_departure',
        description: 'Record that a player has left the session early. They will not receive credit for games played after this point.',
        parameters: {
          type: 'object',
          properties: {
            player_name: {
              type: 'string',
              description: 'Full name of the player who left',
            },
          },
          required: ['player_name'],
        },
      },
    ],
  },
]

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { messages, weekContext } = req.body
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    return res.status(500).json({ reply: 'GEMINI_API_KEY is not configured.', actionsRan: 0 })
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  )

  const systemPrompt = buildSystemPrompt(weekContext)

  // Build Gemini contents from conversation history
  // Gemini requires the turn sequence to start with 'user' and alternate
  let contents = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  // Agentic loop: call Gemini → execute any tool call → send result back → get final reply
  const MAX_TURNS = 5
  let reply = ''
  let actionsRan = 0

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    let geminiRes
    try {
      geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
            tools: TOOLS,
            tool_config: { function_calling_config: { mode: 'AUTO' } },
            generationConfig: { temperature: 0.2 },
          }),
        }
      )
    } catch (err) {
      console.error('Gemini fetch error:', err)
      return res.status(502).json({ reply: 'Could not reach AI service. Try again.', actionsRan })
    }

    const data = await geminiRes.json()

    if (!geminiRes.ok) {
      console.error('Gemini API error:', JSON.stringify(data))
      const msg = data.error?.message ?? 'AI service error.'
      return res.status(502).json({ reply: msg, actionsRan })
    }

    const candidate = data.candidates?.[0]?.content
    if (!candidate) {
      reply = 'No response from AI.'
      break
    }

    // Check for a function call in the response parts
    const funcCallPart = candidate.parts?.find((p) => p.functionCall)

    if (funcCallPart) {
      const { name, args } = funcCallPart.functionCall

      // Append the model's function-call turn to the conversation
      contents.push({ role: 'model', parts: [{ functionCall: { name, args } }] })

      // Execute the tool server-side
      const result = await executeTool(name, args, weekContext, supabase)
      if (result.success) actionsRan++

      // Append the tool result so Gemini can incorporate it
      contents.push({
        role: 'user',
        parts: [{ functionResponse: { name, response: result } }],
      })

      // Loop: Gemini will now produce a text reply (or another tool call)
    } else {
      // Text response — we're done
      reply = candidate.parts?.find((p) => p.text)?.text?.trim() ?? 'Done.'
      break
    }
  }

  return res.json({ reply, actionsRan })
}

// ─── Tool execution ───────────────────────────────────────────────────────────

async function executeTool(name, args, ctx, supabase) {
  const { week, teams, games } = ctx ?? {}
  if (!week) return { error: 'No active session context.' }

  const teamByName = Object.fromEntries(teams.map((t) => [t.name.toLowerCase(), t]))

  function findTeam(n) {
    return teamByName[n?.toLowerCase?.()]
  }

  function findGame(aName, bName) {
    const tA = findTeam(aName)
    const tB = findTeam(bName)
    if (!tA || !tB) return null
    return games.find(
      (g) =>
        (g.team_a_id === tA.id && g.team_b_id === tB.id) ||
        (g.team_a_id === tB.id && g.team_b_id === tA.id)
    )
  }

  try {
    if (name === 'add_game') {
      const tA = findTeam(args.team_a)
      const tB = findTeam(args.team_b)
      if (!tA) return { error: `Team not found: "${args.team_a}". Valid teams: ${teams.map(t => t.name).join(', ')}` }
      if (!tB) return { error: `Team not found: "${args.team_b}". Valid teams: ${teams.map(t => t.name).join(', ')}` }
      const { error } = await supabase
        .from('games')
        .insert({ week_id: week.id, team_a_id: tA.id, team_b_id: tB.id, notes: args.notes ?? null })
      if (error) return { error: error.message }
      return { success: true, message: `Game logged: ${tA.name} vs ${tB.name}` }

    } else if (name === 'record_result') {
      const game = findGame(args.team_a, args.team_b)
      if (!game) return { error: `No game found between "${args.team_a}" and "${args.team_b}". Use add_game first.` }
      const winner = findTeam(args.winner)
      if (!winner) return { error: `Winner team not found: "${args.winner}"` }
      const { error } = await supabase
        .from('games')
        .update({ winner_team_id: winner.id })
        .eq('id', game.id)
      if (error) return { error: error.message }
      return { success: true, message: `Result recorded: ${winner.name} won.` }

    } else if (name === 'delete_game') {
      const game = findGame(args.team_a, args.team_b)
      if (!game) return { error: `No game found between "${args.team_a}" and "${args.team_b}"` }
      const { error } = await supabase.from('games').delete().eq('id', game.id)
      if (error) return { error: error.message }
      return { success: true, message: 'Game deleted.' }

    } else if (name === 'generate_teams') {
      if (games.length > 0) {
        return { error: 'Cannot regenerate teams once games have been played — games are linked to the existing teams. Delete all games first or manage teams via the admin panel.' }
      }
      const numTeams = args.num_teams
      if (![3, 5, 7].includes(numTeams)) {
        return { error: 'Number of teams must be 3, 5, or 7 (must be odd so one team sits out each game).' }
      }
      // Fetch all active players to resolve names → IDs
      const { data: allPlayers, error: pe } = await supabase
        .from('players').select('id, name').eq('active', true)
      if (pe) return { error: pe.message }

      const playerByName = Object.fromEntries(allPlayers.map((p) => [p.name.toLowerCase(), p]))
      const matched = []
      const unmatched = []
      for (const name of args.players) {
        const found = playerByName[name.toLowerCase()]
        if (found) matched.push(found)
        else unmatched.push(name)
      }
      if (unmatched.length > 0) {
        return { error: `Could not find these players: ${unmatched.join(', ')}. Check spelling against the roster.` }
      }
      if (matched.length < numTeams) {
        return { error: `Need at least ${numTeams} players for ${numTeams} teams, got ${matched.length}.` }
      }
      const shuffled = shuffle(matched)
      const newTeams = Array.from({ length: numTeams }, (_, i) => ({
        name: `${TEAM_COLORS[i]} Team`,
        players: [],
      }))
      shuffled.forEach((p, i) => newTeams[i % numTeams].players.push(p))

      // Replace existing teams
      await supabase.from('teams').delete().eq('week_id', week.id)
      for (const team of newTeams) {
        const { data: saved, error: te } = await supabase
          .from('teams').insert({ week_id: week.id, name: team.name }).select().single()
        if (te) return { error: te.message }
        if (team.players.length > 0) {
          const { error: me } = await supabase.from('team_players').insert(
            team.players.map((p) => ({ team_id: saved.id, player_id: p.id }))
          )
          if (me) return { error: me.message }
        }
      }
      return {
        success: true,
        teams: newTeams.map((t) => ({ name: t.name, players: t.players.map((p) => p.name) })),
        message: `Teams generated: ${newTeams.map((t) => `${t.name}: ${t.players.map((p) => p.name).join(', ')}`).join(' | ')}`,
      }

    } else if (name === 'log_player_departure') {
      let foundPlayer = null
      for (const team of teams) {
        const p = team.players.find((p) => p.name.toLowerCase() === args.player_name.toLowerCase())
        if (p) { foundPlayer = p; break }
      }
      if (!foundPlayer) {
        return { error: `Player "${args.player_name}" not found on any team this session.` }
      }
      const { error } = await supabase.from('player_departures').upsert(
        { week_id: week.id, player_id: foundPlayer.id, departed_at: new Date().toISOString() },
        { onConflict: 'week_id,player_id' }
      )
      if (error) return { error: error.message }
      return { success: true, message: `${foundPlayer.name} marked as departed. They won't get credit for games played after this point.` }
    }

    return { error: `Unknown tool: ${name}` }
  } catch (err) {
    return { error: err.message }
  }
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(ctx) {
  if (!ctx?.week) {
    return `You are an assistant for Bush League Bocce. There is no active session right now. Tell the user to start a new session from the admin panel.`
  }

  const { week, teams, games } = ctx
  const date = new Date(week.date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  const teamList = teams
    .map((t) => `• ${t.name}: ${t.players.map((p) => p.name).join(', ')}`)
    .join('\n')

  const gameList =
    games.length === 0
      ? 'None yet.'
      : games
          .map((g, i) => {
            const tA = teams.find((t) => t.id === g.team_a_id)?.name ?? '?'
            const tB = teams.find((t) => t.id === g.team_b_id)?.name ?? '?'
            const result = g.winner_team_id
              ? `${teams.find((t) => t.id === g.winner_team_id)?.name ?? '?'} won`
              : 'no result yet'
            return `  ${i + 1}. ${tA} vs ${tB} — ${result}`
          })
          .join('\n')

  const { departures = [] } = ctx
  const departureList = departures.length === 0
    ? 'None.'
    : departures.map((d) => `• ${d.name} (left ${new Date(d.departed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })})`).join('\n')

  return `You are a helpful assistant for Bush League Bocce, a neighborhood bocce league in the Oakhurst area. You help the league commissioner log games and results conversationally.

CURRENT SESSION:
Week ${week.week_number} — ${date}

TEAMS (use these exact names when calling tools):
${teamList}

GAMES SO FAR:
${gameList}

PLAYERS WHO LEFT EARLY (no credit for games after their departure):
${departureList}

TOOLS AVAILABLE:
- add_game / record_result / delete_game — log and manage games
- generate_teams — randomly assign a list of players into teams (only works before any games are played)
- log_player_departure — mark a player as having left; they lose credit for subsequent games

INSTRUCTIONS:
- Keep replies short and conversational (1–2 sentences) — this is used on a phone
- If someone says "Red beat Blue", add the game if not logged, then record the result — call tools sequentially
- If team names are ambiguous, ask for clarification before acting
- Confirm what you did in plain English after each action`
}
