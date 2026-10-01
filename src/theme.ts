export const colors = {
  bg: '#0f1412',
  panel: '#18201c',
  panelAlt: '#202a25',
  text: '#eef2ef',
  textDim: '#9aa8a0',
  accent: '#3ecf8e',
  warn: '#f5b041',
  bad: '#ef5b5b',
  aim: '#ffd400',
  dart: '#4fc3f7',
  boardSurround: '#111',
  boardDark: '#1b1b1b',
  boardLight: '#efe3c2',
  boardRed: '#d4302f',
  boardGreen: '#1f8a4c',
  boardNumbers: '#f2f2f2',
};

export const gradeColor: Record<string, string> = {
  preferred: colors.accent,
  good_alternative: '#8fd694',
  acceptable: colors.warn,
  poor: colors.bad,
  invalid: colors.bad,
};

export const gradeLabel: Record<string, string> = {
  preferred: 'Best choice',
  good_alternative: 'Good choice',
  acceptable: 'Acceptable',
  poor: 'Poor choice',
  invalid: "Can't work",
};
