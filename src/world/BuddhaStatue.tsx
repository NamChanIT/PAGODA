import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

const gold = '#bd8d42', lightGold = '#d1a45a', darkGold = '#967035';
function Gold({ color = gold, roughness = .48 }: { color?: string; roughness?: number }) {
  return <meshStandardMaterial color={color} metalness={.67} roughness={roughness}/>;
}
function Curve({ points, radius = .012, color = lightGold }: { points: [number, number, number][]; radius?: number; color?: string }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point))), [points]);
  return <mesh><tubeGeometry args={[curve, 32, radius, 6, false]}/><Gold color={color}/></mesh>;
}
function petalGeometry() {
  const positions: number[] = [], indices: number[] = [];
  for (let row = 0; row <= 12; row++) {
    const t = row / 12;
    for (let column = 0; column <= 8; column++) {
      const u = column / 4 - 1;
      positions.push(u * .21 * Math.pow(Math.sin(t * Math.PI), .75), t * .48, Math.sin(t * Math.PI) * (.1 - u * u * .065));
      if (row < 12 && column < 8) {
        const i = row * 9 + column;
        indices.push(i, i + 1, i + 9, i + 1, i + 10, i + 9);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

function HairCurls({ points }: { points: readonly (readonly [number, number, number])[] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const matrix = new THREE.Matrix4();
    points.forEach((point, i) => { matrix.makeTranslation(...point); mesh.current!.setMatrixAt(i, matrix); });
    mesh.current.instanceMatrix.needsUpdate = true; mesh.current.computeBoundingSphere();
  }, [points]);
  return <instancedMesh ref={mesh} args={[undefined, undefined, points.length]}><sphereGeometry args={[.032, 8, 6]}/><Gold color={darkGold}/></instancedMesh>;
}
function HaloRays() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < 48; i++) {
      const angle = i / 48 * Math.PI * 2;
      position.set(Math.cos(angle) * 1.32, Math.sin(angle) * 1.425, 0);
      rotation.setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle - Math.PI / 2);
      matrix.compose(position, rotation, scale); mesh.current.setMatrixAt(i, matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true; mesh.current.computeBoundingSphere();
  }, []);
  return <instancedMesh ref={mesh} args={[undefined, undefined, 48]}><capsuleGeometry args={[.008, .055, 3, 6]}/><Gold color={lightGold}/></instancedMesh>;
}

/** Seated meditation sculpture; origin is the bottom of the lotus pedestal. */
function Sculpture() {
  const petal = useMemo(petalGeometry, []);
  useEffect(() => () => petal.dispose(), [petal]);
  const curls = useMemo(() => Array.from({ length: 7 }, (_, row) => {
    const phi = .18 + row * .185, count = Math.max(6, Math.round(Math.sin(phi) * 26));
    return Array.from({ length: count }, (_, column) => {
      const theta = column / count * Math.PI * 2 + row * .16;
      return [Math.sin(phi) * Math.cos(theta) * .323, 2.62 + Math.cos(phi) * .42, Math.sin(phi) * Math.sin(theta) * .303] as const;
    });
  }).flat(), []);
  return <group>
    {/* Restrained concentric halo and engraved rays, behind the sculpture. */}
    <group position={[0, 1.96, -.52]}>
      {[1.21, 1.28, 1.35].map((radius, i) => <mesh key={radius} scale={[1, 1.08, 1]}><torusGeometry args={[radius, i === 1 ? .023 : .009, 8, 96]}/><Gold color={i === 1 ? lightGold : darkGold}/></mesh>)}
      <HaloRays/>
    </group>
    {/* Turned bronze base with two rows of individually shaped lotus petals. */}
    <mesh castShadow><latheGeometry args={[[new THREE.Vector2(0, 0), new THREE.Vector2(1, 0), new THREE.Vector2(1.06, .045), new THREE.Vector2(1.06, .09), new THREE.Vector2(.99, .13), new THREE.Vector2(.95, .25), new THREE.Vector2(.92, .45), new THREE.Vector2(0, .45)], 64]}/><Gold color={darkGold}/></mesh>
    {[0, 1].map(row => <group key={row}>{Array.from({ length: 18 }, (_, i) => {
      const angle = (i + row * .5) / 18 * Math.PI * 2;
      return <group key={i} rotation={[0, angle, 0]}><mesh geometry={petal} position={[0, row ? .44 : .15, row ? .9 : .86]} rotation={[row ? 2.05 : .7, 0, 0]} castShadow><meshStandardMaterial color={row ? gold : lightGold} metalness={.65} roughness={.5} side={THREE.DoubleSide}/></mesh></group>;
    })}</group>)}
    <mesh position={[0, .54, 0]} castShadow><cylinderGeometry args={[.96, .95, .13, 64]}/><Gold/></mesh>
    <mesh position={[0, .61, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[.91, .025, 8, 64]}/><Gold color={lightGold}/></mesh>
    {/* Crossed legs form a continuous lap rather than separate floating pieces. */}
    <mesh position={[0, .78, .04]} scale={[1.01, .22, .59]} castShadow><sphereGeometry args={[1, 40, 24]}/><Gold/></mesh>
    {[-1, 1].map(side => <group key={side}>
      <mesh position={[side * .43, .89, .15]} rotation={[0, side * -.2, side * .13]} scale={[.61, .20, .39]} castShadow><sphereGeometry args={[1, 32, 20]}/><Gold color={lightGold}/></mesh>
      <mesh position={[side * -.24, .96, .39]} rotation={[.12, side * .15, side * .1]} scale={[.32, .11, .16]}><sphereGeometry args={[1, 24, 16]}/><Gold/></mesh>
    </group>)}
    <mesh scale={[1, 1, .72]} castShadow><latheGeometry args={[[new THREE.Vector2(0, .87), new THREE.Vector2(.38, .88), new THREE.Vector2(.45, 1.08), new THREE.Vector2(.42, 1.4), new THREE.Vector2(.45, 1.75), new THREE.Vector2(.49, 1.97), new THREE.Vector2(.41, 2.1), new THREE.Vector2(.17, 2.2), new THREE.Vector2(0, 2.2)], 48]}/><Gold/></mesh>
    {/* Drapery follows the chest diagonally and gathers in the lap. */}
    {[0, 1, 2, 3].map(i => <Curve key={i} points={[
      [-.34 - i * .022, 2.06 - i * .06, .14], [-.18, 1.91 - i * .1, .29],
      [.08, 1.68 - i * .11, .325], [.34, 1.43 - i * .08, .20],
    ]} radius={.011} color={i % 2 ? darkGold : lightGold}/>)}
    {[-1, 1].map(side => <Curve key={side} points={[[side * .21, .87, .55], [side * .48, .83, .49], [side * .73, .77, .36], [side * .87, .72, .16]]} radius={.014}/>)}
    {/* Both hands rest together, palms up, in the meditation gesture. */}
    {[-1, 1].map(side => <group key={side}>
      <mesh position={[side * .51, 1.65, .015]} rotation={[0, 0, side * .22]} scale={[.18, .47, .20]} castShadow><sphereGeometry args={[1, 28, 20]}/><Gold/></mesh>
      <mesh position={[side * .39, 1.19, .26]} rotation={[0, side * -.4, side * -.48]} scale={[.32, .13, .17]} castShadow><sphereGeometry args={[1, 28, 18]}/><Gold color={lightGold}/></mesh>
    </group>)}
    <mesh position={[0, 1.11, .48]} scale={[.25, .07, .16]}><sphereGeometry args={[1, 28, 18]}/><Gold color={lightGold}/></mesh>
    <mesh position={[.025, 1.165, .48]} scale={[.22, .055, .14]}><sphereGeometry args={[1, 28, 18]}/><Gold/></mesh>
    {[-1, 1].map(side => <mesh key={side} position={[side * .045, 1.21, .48]} rotation={[0, 0, side * .55]} scale={[.035, .07, .035]}><sphereGeometry args={[1, 16, 12]}/><Gold color={lightGold}/></mesh>)}
    <mesh position={[0, 2.23, 0]}><cylinderGeometry args={[.15, .18, .27, 24]}/><Gold/></mesh>
    {/* A single gold material across face and body gives a cast sculpture appearance. */}
    <mesh position={[0, 2.64, .015]} scale={[.31, .405, .285]} castShadow><sphereGeometry args={[1, 48, 32]}/><Gold color={lightGold} roughness={.56}/></mesh>
    <mesh position={[0, 2.64, .005]} scale={[.322, .42, .301]}><sphereGeometry args={[1, 32, 20, 0, Math.PI * 2, 0, 1.35]}/><Gold color={darkGold}/></mesh>
    <HairCurls points={curls}/>
    <mesh position={[0, 3.075, 0]} scale={[.095, .14, .095]}><sphereGeometry args={[1, 24, 16]}/><Gold color={darkGold}/></mesh>
    <mesh position={[0, 3.205, 0]} scale={[.04, .065, .04]}><sphereGeometry args={[1, 16, 12]}/><Gold/></mesh>
    {[-1, 1].map(side => <group key={side}>
      <mesh position={[side * .315, 2.56, .015]} scale={[.067, .16, .06]}><sphereGeometry args={[1, 24, 16]}/><Gold/></mesh>
      <mesh position={[side * .32, 2.58, .064]} scale={[.026, .09, .012]}><sphereGeometry args={[1, 16, 12]}/><Gold color={darkGold}/></mesh>
      <Curve points={[[side * .045, 2.68, .287], [side * .12, 2.695, .269], [side * .20, 2.68, .224]]} radius={.012} color={darkGold}/>
      <Curve points={[[side * .055, 2.625, .29], [side * .12, 2.608, .27], [side * .18, 2.625, .238]]} radius={.009} color={darkGold}/>
    </group>)}
    <mesh position={[0, 2.585, .29]} scale={[.035, .095, .035]}><sphereGeometry args={[1, 24, 16]}/><Gold color={lightGold}/></mesh>
    <mesh position={[0, 2.525, .307]} scale={[.051, .028, .028]}><sphereGeometry args={[1, 24, 16]}/><Gold color={lightGold}/></mesh>
    <Curve points={[[-.075, 2.465, .262], [0, 2.452, .278], [.075, 2.465, .262]]} radius={.008} color={darkGold}/>
    <mesh position={[0, 2.755, .279]}><sphereGeometry args={[.017, 14, 10]}/><Gold color={lightGold}/></mesh>
  </group>;
}

export const BuddhaStatue = memo(Sculpture);
