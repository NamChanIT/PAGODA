type Point = { x: number; z: number };
type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };
export function moveOnGround(from: Point, target: Point, bounds: Bounds, obstacles: Bounds[]): Point;
