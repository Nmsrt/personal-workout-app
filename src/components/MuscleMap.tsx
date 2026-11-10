import type { Muscle, MuscleSummary } from '../muscles'

/* Left half of each view (viewBox 0 0 100 210, midline x = 50); the right half is mirrored. */
type Part = { m?: Muscle; d: string }

const ARM_UPPER = 'M24 58C26 50 30 45 33 46C34 54 32 66 29 76C26 77 23 75 22 72C22 67 22 62 24 58Z'
const FOREARM = 'M22 79C25 81 28 81 29 80C29 90 26 101 23 110L18 110C17 100 18 88 22 79Z'
const DELT = 'M33 35C27 35 22 39 21 47C21 51 22 54 24 56C26 49 29 44 34 41Z'
const HAND = 'M17 113C19 111 23 111 24 113L24 120C22 123 18 123 17 120Z'
const KNEE = 'M35 155C38 153 42 153 45 155L45 159C42 161 38 161 35 159Z'
const FOOT = 'M36 199L43 199C45 201 46 204 44 206L35 206C34 203 35 201 36 199Z'

const FRONT: Part[] = [
  { m: 'shoulders', d: DELT },
  { m: 'chest', d: 'M35 39C40 36 46 36 49 37L49 56C44 59 37 58 33 54C32 48 33 43 35 39Z' },
  { m: 'biceps', d: ARM_UPPER },
  { m: 'forearms', d: FOREARM },
  { d: HAND },
  { m: 'abs', d: 'M41 60L49 60L49 76L41 76Z' },
  { m: 'abs', d: 'M41 78L49 78L49 98C46 99 43 98 41 95Z' },
  { m: 'obliques', d: 'M34 57C36 60 38 61 39 61L39 93C37 91 35 88 34 85C35 76 35 66 34 57Z' },
  { m: 'quads', d: 'M33 99C37 103 43 106 49 108C48 122 47 138 45 152C41 153 38 153 35 152C32 138 31 118 33 99Z' },
  { d: KNEE },
  { m: 'calves', d: 'M35 162C38 161 42 161 45 162C46 174 44 187 43 197L37 197C35 187 34 174 35 162Z' },
  { d: FOOT }
]

const BACK: Part[] = [
  { m: 'traps', d: 'M49 25L49 52C46 46 41 41 35 37C39 35 43 32 45 26Z' },
  { m: 'rearDelts', d: DELT },
  { m: 'upperBack', d: 'M35 40C41 43 46 50 49 56L49 74C45 80 41 85 38 87C35 76 33 58 35 40Z' },
  { m: 'triceps', d: ARM_UPPER },
  { m: 'forearms', d: FOREARM },
  { d: HAND },
  { m: 'lowerBack', d: 'M39 89C43 85 46 80 49 77L49 98L39 96Z' },
  { m: 'glutes', d: 'M33 97L49 100L49 116C45 121 37 121 33 116C32 110 32 103 33 97Z' },
  { m: 'hamstrings', d: 'M33 120C37 123 45 123 48 120C47 131 46 142 45 152C41 153 38 153 35 152C33 141 32 130 33 120Z' },
  { d: KNEE },
  { m: 'calves', d: 'M35 161C38 159 43 159 45 162C47 171 45 182 43 189C41 195 38 195 36 189C33 180 33 169 35 161Z' },
  { d: 'M37 193L43 193L43 198L37 198Z' },
  { d: FOOT }
]

function Half({ parts, tiers }: { parts: Part[]; tiers: MuscleSummary['tiers'] }) {
  return (
    <>
      {parts.map((p, i) => (
        <path key={i} d={p.d} className={`mm-part${p.m && tiers[p.m] ? ` t${tiers[p.m]}` : ''}`} />
      ))}
    </>
  )
}

function View({ parts, tiers, label, neck }: { parts: Part[]; tiers: MuscleSummary['tiers']; label: string; neck: boolean }) {
  return (
    <svg className="mm-view" viewBox="0 0 100 210" aria-hidden="true" focusable="false">
      <title>{label}</title>
      <ellipse className="mm-part" cx="50" cy="13" rx="9" ry="11" />
      {neck && <path className="mm-part" d="M45 24L55 24L56 33L44 33Z" />}
      <Half parts={parts} tiers={tiers} />
      <g transform="translate(100 0) scale(-1 1)">
        <Half parts={parts} tiers={tiers} />
      </g>
    </svg>
  )
}

/** Front and back body outline with the routine's worked muscles shaded by how hard they are hit. */
export function MuscleMap({ summary }: { summary: MuscleSummary }) {
  return (
    <div className="muscle-map">
      <View parts={FRONT} tiers={summary.tiers} label="Front" neck />
      <View parts={BACK} tiers={summary.tiers} label="Back" neck={false} />
    </div>
  )
}
