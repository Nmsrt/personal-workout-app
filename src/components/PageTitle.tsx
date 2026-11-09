import { Icon } from './Icon'

/** Centered page title with an optional subtitle and back button. */
export function PageTitle({ title, sub, onBack, backLabel = 'Back' }: { title: string; sub?: string; onBack?: () => void; backLabel?: string }) {
  return (
    <header className={`page-title${onBack ? ' with-back' : ''}`}>
      {onBack && (
        <button className="btn icon-only ghost page-back" aria-label={backLabel} onClick={onBack}>
          <Icon name="chevL" size={22} />
        </button>
      )}
      <div className="page-title-text">
        <h1>{title}</h1>
        {sub && <span className="page-sub">{sub}</span>}
      </div>
    </header>
  )
}
