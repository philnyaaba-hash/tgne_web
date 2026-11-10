const PATHS = {
  arrowRight: ['M5 12h14', 'M13 6l6 6-6 6'],
  arrowLeft: ['M19 12H5', 'M11 18l-6-6 6-6'],
  check: ['M20 6L9 17l-5-5'],
  mapPin: ['M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11z'],
  ruler: ['M3 17L17 3l4 4L7 21z', 'M8 12l2 2', 'M12 8l2 2', 'M16 4l2 2'],
  shield: ['M12 3l7 3v5c0 4.5-3 8.4-7 10-4-1.6-7-5.5-7-10V6z', 'M9 12l2 2 4-4'],
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.3-4.3'],
  menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  mail: ['M3 6h18v12H3z', 'M3 7l9 6 9-6'],
  phone: ['M6 3h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2z'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3 2'],
  chevronDown: ['M6 9l6 6 6-6'],
  document: ['M6 3h8l4 4v14H6z', 'M14 3v5h5', 'M9 13h6', 'M9 17h6'],
  bank: ['M3 10l9-6 9 6', 'M5 10v8', 'M9 10v8', 'M15 10v8', 'M19 10v8', 'M3 21h18'],
  mobile: ['M7 2h10v20H7z', 'M11 18h2'],
  leaf: ['M4 20c0-9 6-14 16-16 1 10-4 16-13 16', 'M4 20c3-5 7-8 12-10'],
  calendar: ['M4 6h16v15H4z', 'M8 3v5', 'M16 3v5', 'M4 11h16'],
  info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 11v5', 'M12 8h.01'],
  arrowUpRight: ['M7 17L17 7', 'M8 7h9v9'],
  quote: ['M9 11H5a4 4 0 0 1 4-4', 'M9 11v6H5v-6', 'M19 11h-4a4 4 0 0 1 4-4', 'M19 11v6h-4v-6'],
  users: ['M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2', 'M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M17 11a3.5 3.5 0 1 0 0-7', 'M21 21v-2a4 4 0 0 0-3-3.87'],
  user: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z']
};

export default function Icon({ name, size = 18, className = '', strokeWidth = 1.7 }) {
  const paths = PATHS[name];
  if (!paths) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {paths.map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

