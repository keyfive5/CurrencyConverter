export const colors = {
  bg: '#0A0B0F',
  surface: '#151821',
  surfaceActive: '#1B2430',
  border: '#232838',
  accent: '#4ADE80',
  accentDim: '#1E3A2B',
  text: '#F2F5F9',
  textDim: '#8A94A8',
  textFaint: '#5A6478',
  warn: '#FBBF24',
  key: '#171B24',
  keyPress: '#242A38',
};

export const radius = {
  row: 16,
  key: 14,
  sheet: 24,
};

/** iOS renders numbers with proportional widths by default; money needs monospaced digits. */
export const tabular = { fontVariant: ['tabular-nums' as const] };
