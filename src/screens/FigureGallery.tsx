import { ExerciseFigure } from '../components/ExerciseFigure'
import { ANIMS } from '../figures/anims'

/** Review sheet for all exercise illustrations (open the app with #figures). */
export function FigureGallery() {
  return (
    <div className="screen">
      <h1 className="display">Figures</h1>
      <div className="gallery">
        {Object.entries(ANIMS).map(([k, a]) => (
          <div key={k} className="gallery-item" data-anim={k}>
            <strong>{a.label}</strong>
            <div className="gallery-row">
              <ExerciseFigure anim={k} at={0} title="start" />
              <ExerciseFigure anim={k} at={1} title="end" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
