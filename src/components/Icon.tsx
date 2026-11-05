const PATHS: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  calendar: 'M4 6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 10h16M9 3v4M15 3v4',
  chart: 'M4 20V4M4 20h16M8 16l4-5 3 3 5-7',
  sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M10 10v4M18 16v4',
  play: 'M7 4.5v15l13-7.5z',
  pause: 'M7 4h3.5v16H7zM13.5 4H17v16h-3.5z',
  reset: 'M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5',
  check: 'M4.5 12.5 9.5 17.5 19.5 6.5',
  chevL: 'M15 5 8 12l7 7',
  chevR: 'M9 5l7 7-7 7',
  skip: 'M5 5l8 7-8 7zM17 5v14',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  x: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5v1.5A3.5 3.5 0 0 0 8 11M16 6h3.5v1.5A3.5 3.5 0 0 1 16 11M12 13v4M8 21h8M9.5 17h5v4h-5z',
  flame: 'M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.4 2.4-5.4 3.9-8.3.4 1.9 1.4 3 2.6 3.6C12 7 13 4.6 15.2 3c-.4 3.2 3.3 5.6 3.3 11.1 0 4.1-2.8 6.9-6.5 6.9z',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  menu: 'M15 5 8 12l7 7',
  bolt: 'M13 3 5 13.5h6L10 21l8-10.5h-6z',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  copy: 'M8 8h11v12H8zM5 16V4h11',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  upload: 'M12 20V9M7 14l5-5 5 5M5 4h14',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  layers: 'M12 3 3 8l9 5 9-5zM3 13l9 5 9-5',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z'
}

export function Icon({ name, size = 22, stroke = 1.9 }: { name: keyof typeof PATHS | string; size?: number; stroke?: number }) {
  const filled = name === 'play' || name === 'pause'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="icon"
    >
      <path d={PATHS[name] ?? ''} />
    </svg>
  )
}
