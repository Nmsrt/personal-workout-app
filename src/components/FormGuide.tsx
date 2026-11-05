import { useState } from 'react'
import { animFor } from '../figures/anims'
import type { Exercise } from '../types'
import { ExerciseFigure } from './ExerciseFigure'

/** Exercise demo: the user's photo if they added one, otherwise the animated silhouette. */
export function FormGuide({ ex, compact }: { ex: Exercise; compact?: boolean }) {
  const anim = animFor(ex)
  const [view, setView] = useState<'photo' | 'figure'>(ex.photo ? 'photo' : 'figure')
  if (!anim && !ex.photo) return null
  const showPhoto = ex.photo && (view === 'photo' || !anim)
  return (
    <div className={`guide${compact ? ' compact' : ''}`}>
      {showPhoto ? (
        <img className="guide-photo" src={ex.photo} alt={`${ex.name} form photo`} />
      ) : (
        anim && <ExerciseFigure anim={anim} dumbbells={ex.weight > 0} title={`How to do ${ex.name}`} />
      )}
      {ex.photo && anim && (
        <div className="guide-switch" role="tablist" aria-label="Demo type">
          <button role="tab" aria-selected={view === 'figure'} className={view === 'figure' ? 'on' : ''} onClick={() => setView('figure')}>
            Guide
          </button>
          <button role="tab" aria-selected={view === 'photo'} className={view === 'photo' ? 'on' : ''} onClick={() => setView('photo')}>
            Photo
          </button>
        </div>
      )}
    </div>
  )
}

/** Small static thumbnail for lists. */
export function GuideThumb({ ex, animate = false }: { ex: Exercise; animate?: boolean }) {
  const anim = animFor(ex)
  if (ex.photo) return <img className="thumb thumb-photo" src={ex.photo} alt="" />
  if (!anim) return <span className="thumb" />
  return <ExerciseFigure anim={anim} dumbbells={ex.weight > 0} animate={animate} className="thumb" title={ex.name} />
}
