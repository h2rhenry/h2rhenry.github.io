import { svgEl } from './utils.js';

const PATHS = {
  dashboard: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
  path: 'M9 20l-5 2V6l5-2 6 2 5-2v16l-5 2-6-2zM9 4v16M15 6v16',
  vocabulary: 'M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zm0 0a2 2 0 0 0 2 2h13M8 7h7',
  grammar: 'M4 6h16M4 12h10M4 18h16',
  listening: 'M4 15v-3a8 8 0 0 1 16 0v3M4 15h3v5H4zM20 15h-3v5h3z',
  reading: 'M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2zM22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z',
  writing: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3',
  speaking: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  ielts: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  toeic: 'M3 8h18v12H3zM9 8V5h6v3M3 13h18',
  review: 'M20 11a8 8 0 0 0-14-4M4 4v4h4M4 13a8 8 0 0 0 14 4M20 20v-4h-4',
  stats: 'M5 20V10M12 20V4M19 20v-7',
  settings: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M14 4v4M8 10v4M16 16v4',
  menu: 'M4 6h16M4 12h16M4 18h16',
  moon: 'M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
  chevron: 'M15 6l-6 6 6 6',
  check: 'M5 12l5 5 9-10',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  close: 'M6 6l12 12M18 6L6 18',
  volume: 'M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6',
  flame: 'M12 22a7 7 0 0 0 7-7c0-4-3-6-4-9-2 1-3 3-3 5-1-1-2-2-2-4-3 2-5 5-5 8a7 7 0 0 0 7 7z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z',
};

export function icon(name) {
  return svgEl('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' }, svgEl('path', { d: PATHS[name] || PATHS.more }));
}
