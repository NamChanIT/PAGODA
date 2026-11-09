import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { seats } from './types';
import type { Player } from './types';

const palette = {
  skin: '#e2b78d', blush: '#d49a7c', robe: '#b6c0ba', trim: '#899a94',
  pants: '#a1b0a9', sash: '#d5bb70', sashEdge: '#b89a50', shoes: '#d8d4bc',
};

// The stole follows the chest/back instead of intersecting the robe as a box.
function stoleGeometry(back: boolean) {
  const points: number[] = [], indices: number[] = [];
  const profile = [[0, .34], [.025, .39], [.08, .40], [.36, .36], [.6, .32], [.7, .31], [.78, .24], [.8, .13]];
  const radiusAt = (y: number) => {
    const upper = profile.findIndex(point => point[0] >= y);
    const a = profile[Math.max(0, upper - 1)], b = profile[Math.max(0, upper)];
    return a[1] + (b[1] - a[1]) * ((y - a[0]) / (b[0] - a[0] || 1));
  };
  for (let row = 0; row <= 16; row++) {
    const t = row / 16, y = .055 + t * .67;
    const radius = radiusAt(y);
    for (let column = 0; column <= 6; column++) {
      const u = column / 6;
      const x = -.15 + u * .30 + t * .10;
      const z = Math.sqrt(Math.max(.001, radius * radius - x * x)) * .8 + .014;
      points.push(x, y, back ? -z : z);
      if (row < 16 && column < 6) {
        const i = row * 7 + column;
        indices.push(i, i + 1, i + 7, i + 1, i + 8, i + 7);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

export function Character({ player, local = false }: { player: Player; local?: boolean }) {
  const initialPosition = useRef<[number, number, number]>([player.x, 0, player.z]);
  const root = useRef<THREE.Group>(null), torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null), arms = useRef<THREE.Group>(null);
  const legs = useRef<THREE.Group>(null), beads = useRef<THREE.Group>(null);
  const tag = useRef<THREE.Group>(null);
  const foldedLegs = useRef<THREE.Group>(null);
  const target = useRef(new THREE.Vector3());
  const previous = useRef(new THREE.Vector3(player.x, 0, player.z));
  const gait = useRef(0), seatedBlend = useRef(0);
  const geometry = useMemo(() => ({
    robe: new THREE.LatheGeometry([
      new THREE.Vector2(0, 0), new THREE.Vector2(.34, 0),
      new THREE.Vector2(.39, .025), new THREE.Vector2(.40, .08),
      new THREE.Vector2(.36, .36), new THREE.Vector2(.32, .6),
      new THREE.Vector2(.31, .7), new THREE.Vector2(.24, .78), new THREE.Vector2(.13, .8),
    ], 32),
    front: stoleGeometry(false), back: stoleGeometry(true),
  }), []);
  useEffect(() => () => Object.values(geometry).forEach(item => item.dispose()), [geometry]);

  useFrame(({ clock }, delta) => {
    if (!root.current || !torso.current) return;
    const dt = Math.min(delta, .05), time = clock.elapsedTime;
    const onCushion = seats.some(seat => Math.abs(player.x - seat.x) < .73 && Math.abs(player.z - seat.z) < .73);
    target.current.set(player.x, onCushion ? .28 : 0, player.z);
    const speed = Math.hypot(player.x - previous.current.x, player.z - previous.current.z) / Math.max(dt, .001);
    gait.current = THREE.MathUtils.damp(gait.current, speed > .12 ? 1 : 0, 9, dt);
    previous.current.copy(target.current);
    root.current.position.lerp(target.current, local ? 1 : 1 - Math.exp(-12 * dt));
    root.current.rotation.y += Math.atan2(Math.sin(player.yaw - root.current.rotation.y), Math.cos(player.yaw - root.current.rotation.y)) * Math.min(1, dt * 12);
    const seated = player.ritual === 'sit' || player.ritual === 'bow';
    seatedBlend.current = THREE.MathUtils.damp(seatedBlend.current, seated ? 1 : 0, 7, dt);
    const blend = seatedBlend.current;
    const breath = Math.sin(time * 1.8) * .009 * (1 - gait.current);
    torso.current.position.y = .62 - blend * .34 + Math.abs(Math.sin(time * 9)) * .025 * gait.current + breath;
    torso.current.rotation.x = THREE.MathUtils.damp(torso.current.rotation.x, player.ritual === 'bow' ? .24 + (.5 + Math.sin(time * 1.8) * .5) * .7 : 0, 6, dt);
    if (head.current) head.current.rotation.x = THREE.MathUtils.damp(head.current.rotation.x, seated ? .06 : 0, 5, dt);
    arms.current?.children.forEach((arm, index) => {
      const side = index ? 1 : -1;
      const praying = player.ritual === 'bow' || player.ritual === 'beads';
      arm.rotation.x = THREE.MathUtils.damp(arm.rotation.x, praying ? -1.15 : seated ? -.7 : Math.sin(time * 9 + index * Math.PI) * .35 * gait.current, 9, dt);
      arm.rotation.z = THREE.MathUtils.damp(arm.rotation.z, praying ? side * -.78 : seated ? side * -.25 : side * .12, 9, dt);
      arm.rotation.y = praying ? side * .2 : 0;
    });
    if (legs.current) legs.current.visible = blend < .85;
    if (foldedLegs.current) {
      foldedLegs.current.visible = blend >= .15;
      foldedLegs.current.scale.setScalar(Math.max(.01, blend));
    }
    legs.current?.children.forEach((leg, index) => {
      const side = index ? 1 : -1;
      leg.position.y = .62 - blend * .31;
      leg.rotation.x = THREE.MathUtils.lerp(Math.sin(time * 9 + index * Math.PI) * .44 * gait.current, -1.25, blend);
      leg.rotation.z = -side * .65 * blend;
      const shin = leg.children[1];
      if (shin) shin.rotation.x = 1.45 * blend;
    });
    if (beads.current) { beads.current.visible = player.ritual === 'beads'; beads.current.rotation.z = Math.sin(time * .9) * .08; }
    if (tag.current) tag.current.position.y = 2.56 - blend * .34;
  });

  return <group ref={root} position={initialPosition.current}>
    <group ref={tag} position={[0, 2.56, 0]}>
      <Html center distanceFactor={12} zIndexRange={[9, 0]} style={{ pointerEvents: 'none' }}>
        <span className={`name-tag ${local ? 'self' : ''}`}>{player.name}{local ? ' · Bạn' : ''}</span>
      </Html>
    </group>
    <group ref={legs}>
      {[-1, 1].map(side => <group key={side} position={[side * .16, .62, 0]}>
        <mesh position={[0, -.15, 0]} castShadow><capsuleGeometry args={[.13, .18, 5, 14]}/><meshStandardMaterial color={palette.pants} roughness={.95}/></mesh>
        <group position={[0, -.3, 0]}>
          <mesh position={[0, -.095, 0]} castShadow><capsuleGeometry args={[.115, .12, 5, 14]}/><meshStandardMaterial color={palette.pants} roughness={.95}/></mesh>
          <mesh position={[0, -.23, .06]} scale={[1, .44, 1.5]} castShadow><sphereGeometry args={[.15, 18, 12]}/><meshStandardMaterial color={palette.shoes} roughness={.9}/></mesh>
          <mesh position={[0, -.265, .06]} scale={[1, .13, 1.48]}><sphereGeometry args={[.15, 18, 10]}/><meshStandardMaterial color="#a9a68f" roughness={.95}/></mesh>
        </group>
      </group>)}
    </group>
    <group ref={foldedLegs} visible={false}>
      {[-1, 1].map(side => <group key={side}>
        <mesh position={[side * .14, .16, .15]} rotation={[0, side * .25, Math.PI / 2]} castShadow><capsuleGeometry args={[.135, .30, 5, 18]}/><meshStandardMaterial color={palette.pants} roughness={.95}/></mesh>
        <mesh position={[side * .2, .115, .29]} scale={[1, .55, 1.35]}><sphereGeometry args={[.12, 16, 12]}/><meshStandardMaterial color={palette.shoes} roughness={.95}/></mesh>
      </group>)}
    </group>
    <group ref={torso} position={[0, .62, 0]}>
      <mesh geometry={geometry.robe} scale={[1, 1, .8]} castShadow><meshStandardMaterial color={palette.robe} roughness={.93}/></mesh>
      <mesh geometry={geometry.front}><meshStandardMaterial color={palette.sash} side={THREE.DoubleSide} roughness={.94}/></mesh>
      <mesh geometry={geometry.back}><meshStandardMaterial color={palette.sash} side={THREE.DoubleSide} roughness={.94}/></mesh>
      <mesh position={[.13, .76, 0]} rotation={[0, Math.PI / 2, 0]} scale={[1, .22, 1]}><torusGeometry args={[.25, .06, 8, 24, Math.PI]}/><meshStandardMaterial color={palette.sash} roughness={.94}/></mesh>
      <mesh position={[-.075, .74, .08]} rotation={[.22, 0, -.65]} scale={[1, 1, .5]}><torusGeometry args={[.13, .025, 8, 24, Math.PI]}/><meshStandardMaterial color={palette.trim} roughness={.9}/></mesh>
      {[-.23, -.05, .18].map((x, i) => <mesh key={x} position={[x, .14, .294 - Math.abs(x) * .15]} rotation={[0, 0, (i - 1) * .05]} scale={[.35, 1, .22]}><capsuleGeometry args={[.025, .18, 3, 8]}/><meshStandardMaterial color={palette.trim} transparent opacity={.32} roughness={1}/></mesh>)}
      <group ref={arms}>
        {[-1, 1].map(side => <group key={side} position={[side * .31, .65, 0]} rotation={[0, 0, side * .12]}>
          <mesh position={[0, -.17, 0]} castShadow><capsuleGeometry args={[.145, .22, 5, 16]}/><meshStandardMaterial color={palette.robe} roughness={.95}/></mesh>
          <mesh position={[0, -.345, 0]}><cylinderGeometry args={[.127, .12, .055, 16]}/><meshStandardMaterial color={palette.trim} roughness={.95}/></mesh>
          <mesh position={[0, -.405, .012]} scale={[.8, 1, .72]} castShadow><sphereGeometry args={[.12, 16, 12]}/><meshStandardMaterial color={palette.skin} roughness={.85}/></mesh>
        </group>)}
      </group>
      <group ref={head} position={[0, 1.28, 0]}>
        <mesh scale={[1, 1.025, .94]} castShadow><sphereGeometry args={[.49, 32, 24]}/><meshStandardMaterial color={palette.skin} roughness={.8}/></mesh>
        <mesh position={[0, -.44, 0]}><cylinderGeometry args={[.115, .13, .19, 16]}/><meshStandardMaterial color={palette.skin} roughness={.85}/></mesh>
        {[-1, 1].map(side => <group key={side}>
          <mesh position={[side * .475, -.015, 0]} scale={[.65, 1, .7]}><sphereGeometry args={[.105, 16, 12]}/><meshStandardMaterial color={palette.skin} roughness={.85}/></mesh>
          <mesh position={[side * .495, -.015, .05]} scale={[.38, .6, .22]}><sphereGeometry args={[.105, 12, 10]}/><meshStandardMaterial color={palette.blush} roughness={.85}/></mesh>
          <mesh position={[side * .155, .015, .439]} rotation={[0, 0, side * -.1]} scale={[1, .3, .3]}><sphereGeometry args={[.065, 16, 10]}/><meshStandardMaterial color="#5c4437" roughness={.9}/></mesh>
          <mesh position={[side * .235, -.08, .394]} scale={[1, .45, .16]}><sphereGeometry args={[.075, 14, 10]}/><meshStandardMaterial color={palette.blush} roughness={1}/></mesh>
        </group>)}
        <mesh position={[0, -.065, .46]} scale={[.7, 1, .7]}><sphereGeometry args={[.048, 14, 10]}/><meshStandardMaterial color={palette.skin} roughness={.9}/></mesh>
        <mesh position={[0, -.145, .433]} rotation={[0, 0, Math.PI]}><torusGeometry args={[.045, .009, 6, 16, Math.PI]}/><meshStandardMaterial color="#976a52" roughness={.9}/></mesh>
      </group>
      <group ref={beads} position={[0, .22, .48]} visible={false}>
        {Array.from({ length: 18 }, (_, i) => <mesh key={i} position={[Math.cos(i / 18 * Math.PI * 2) * .16, Math.sin(i / 18 * Math.PI * 2) * .2, 0]}><sphereGeometry args={[.029, 10, 8]}/><meshStandardMaterial color="#754d2e" roughness={.58}/></mesh>)}
        <mesh position={[0, -.25, 0]}><coneGeometry args={[.035, .12, 10]}/><meshStandardMaterial color="#ac7741"/></mesh>
      </group>
    </group>
  </group>;
}
