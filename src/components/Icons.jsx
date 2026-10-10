const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
const I = (p) => <svg {...base} {...p} />

export const SearchIcon = (p) => <I {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-3.6-3.6" /></I>
export const CloseIcon = (p) => <I {...p}><path d="M6 6l12 12M18 6 6 18" /></I>
export const ChevronL = (p) => <I {...p}><path d="m15 5-7 7 7 7" /></I>
export const ChevronR = (p) => <I {...p}><path d="m9 5 7 7-7 7" /></I>
export const ChevronD = (p) => <I {...p}><path d="m6 9 6 6 6-6" /></I>
export const PlusIcon = (p) => <I {...p}><path d="M12 5v14M5 12h14" /></I>
export const MinusIcon = (p) => <I {...p}><path d="M5 12h14" /></I>
export const ResetIcon = (p) => <I {...p}><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /></I>
export const SpinIcon = (p) => <I {...p}><path d="M20 12a8 8 0 1 1-2.6-5.9" /><path d="M20 4v4.5h-4.5" /></I>
export const BarsIcon = (p) => <I {...p}><path d="M5 20V12M10 20V6M15 20v-9M20 20V9" /></I>
export const HelpIcon = (p) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .9-1 1.6M12 17h.01" /></I>
export const QuizIcon = (p) => <I {...p}><path d="M9 4h6M10 4v5.2L5.4 17a2.2 2.2 0 0 0 1.9 3.3h9.4a2.2 2.2 0 0 0 1.9-3.3L14 9.2V4" /><path d="M8.4 14h7.2" /></I>
export const UpIcon = (p) => <I {...p}><path d="m6 15 6-6 6 6" /></I>
export const CheckIcon = (p) => <I {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></I>
export const FlameIcon = (p) => <I {...p}><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 .2 1.4 1 2 1.8 2C10.5 8 11 5.5 12 3Z" /></I>
export const ShareIcon = (p) => <I {...p}><path d="M10 14 20 4M20 4h-6M20 4v6M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" /></I>
export const CompassIcon = (p) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></I>
export const ChartIcon = (p) => <I {...p}><path d="M4 4v16h16" /><path d="m7 15 3.5-4.5 3 2.5L19 7" /></I>
export const DiceIcon = (p) => <I {...p}><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01" strokeWidth="2.4" /></I>
export const MoreIcon = (p) => <I {...p}><path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth="2.6" /></I>
