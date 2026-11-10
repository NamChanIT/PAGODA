type Point = { x: number; z: number };
type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };
export function moveOnGround(from: Point, target: Point, bounds: Bounds, obstacles: Bounds[]): Point;
export type ExitRoute = { stage: 'center' | 'exit'; centerZ: number };
export function gardenExitStep(position: Point, priorRoute: ExitRoute | null, confirmed: Point | null): {
  route: ExitRoute; goal: Point; atGoal: boolean; arrived: boolean;
};
