import layout from './layout.json';
export { layout };
export type Ritual = 'stand' | 'bow' | 'sit' | 'beads';
export type Player = { id: string; name: string; x: number; z: number; yaw: number; ritual: Ritual; seatId?: number | null };
export const seats = Array.from({ length: layout.seating.count }, (_, i) => ({
  id: i, x: (i % layout.seating.columns - (layout.seating.columns - 1) / 2) * layout.seating.spacingX,
  z: Math.floor(i / layout.seating.columns) * layout.seating.spacingZ + layout.seating.startZ,
}));
export type Seat = typeof seats[number];
export type Correction = { x: number; z: number; reset?: boolean };
