import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Timber } from './TempleDecor';

type Instance = { at: [number, number, number]; scale: [number, number, number]; color: string; turn?: number };
const noise = (n: number) => { const value = Math.sin(n * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value); };

// Leaves, blossoms and pebbles share geometry and draw calls, including in low quality.
function Clusters({ items, stone = false, shadow = false }: { items: Instance[]; stone?: boolean; shadow?: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const object = new THREE.Object3D(), color = new THREE.Color();
    items.forEach((item, index) => {
      object.position.set(...item.at); object.scale.set(...item.scale); object.rotation.set(0, item.turn || 0, 0); object.updateMatrix();
      mesh.current!.setMatrixAt(index, object.matrix); mesh.current!.setColorAt(index, color.set(item.color));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [items]);
  return <instancedMesh ref={mesh} args={[undefined, undefined, items.length]} castShadow={shadow} receiveShadow>
    {stone ? <dodecahedronGeometry args={[1, 0]}/> : <sphereGeometry args={[1, 8, 6]}/>}
    <meshStandardMaterial roughness={.95}/>
  </instancedMesh>;
}

export function OrnamentalTree({ x, z, scale = 1, flowering = false }: { x: number; z: number; scale?: number; flowering?: boolean }) {
  const leaves = useMemo<Instance[]>(() => Array.from({ length: 27 }, (_, i) => {
    const turn = i * 2.4, radius = i < 20 ? 1.65 : .55;
    return { at: [Math.sin(turn) * radius, 5.1 + noise(i + 7) * 1.8, Math.cos(turn) * radius],
      scale: [.7 + noise(i) * .55, .65 + noise(i + 3) * .35, .9],
      color: flowering ? ['#bd8798', '#dca6b4', '#f0c8c9'][i % 3] : ['#3f624c', '#67834f', '#96a76b'][i % 3] };
  }), [flowering]);
  const blossoms = useMemo<Instance[]>(() => Array.from({ length: 38 }, (_, i) => ({
    at: [Math.sin(i * 2.4) * (1 + noise(i) * 1.6), 4.8 + noise(i + 23) * 2.3, Math.cos(i * 2.4) * (1 + noise(i) * 1.6)],
    scale: [.12, .1, .12], color: ['#f4ded3', '#f7e8d8', '#dcadb0'][i % 3],
  })), []);
  return <group position={[x, 0, z]} scale={scale}>
    <mesh position={[0, 2.65, 0]} rotation={[0, 0, -.06]} castShadow><cylinderGeometry args={[.13, .3, 5.3, 9]}/><meshStandardMaterial color="#6a5541" roughness={1}/></mesh>
    {[0, 1, 2].map(i => <mesh key={i} position={[Math.sin(i * 2.1) * .5, 4.3, Math.cos(i * 2.1) * .5]} rotation={[Math.cos(i * 2.1) * .6, 0, -Math.sin(i * 2.1) * .6]} castShadow><cylinderGeometry args={[.055, .12, 2.2, 7]}/><meshStandardMaterial color="#74604b" roughness={1}/></mesh>)}
    <Clusters items={leaves} shadow/>
    {flowering && <Clusters items={blossoms}/>}
    <mesh position={[0, .08, 0]} scale={[1.2, .12, 1]}><sphereGeometry args={[1.35, 12, 8]}/><meshStandardMaterial color="#6f8050" roughness={1}/></mesh>
  </group>;
}

export function LotusPond({ x, z }: { x: number; z: number }) {
  const ripples = useRef<THREE.Group>(null);
  const fish = useRef<THREE.Group>(null);
  const planting = useMemo<Instance[]>(() => {
    const items: Instance[] = [];
    for (let i = 0; i < 16; i++) {
      const x = Math.sin(i * 2.4) * (1.2 + noise(i) * .35), z = Math.cos(i * 2.4) * 1.65;
      items.push({ at: [x, .22, z], scale: [.25 + noise(i) * .12, .015, .25], color: i % 2 ? '#739051' : '#91a75f' });
      if (i % 3) continue;
      for (let petal = 0; petal < 9; petal++) {
        const a = petal / 9 * Math.PI * 2;
        items.push({ at: [x + Math.sin(a) * .14, .285, z + Math.cos(a) * .14], scale: [.075, .045, .16], turn: a, color: petal % 2 ? '#e8b1c2' : '#f7d9dd' });
      }
      for (let petal = 0; petal < 5; petal++) {
        const a = petal / 5 * Math.PI * 2;
        items.push({ at: [x + Math.sin(a) * .065, .33, z + Math.cos(a) * .065], scale: [.055, .085, .095], turn: a, color: '#f5d4d9' });
      }
      items.push({ at: [x, .37, z], scale: [.07, .06, .07], color: '#dfbc64' });
    }
    return items;
  }, []);
  useFrame(({ clock }) => {
    ripples.current?.children.forEach((ring, i) => {
      const phase = (clock.elapsedTime * .22 + i / 3) % 1;
      ring.scale.setScalar(.25 + phase * .8);
      (ring as THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>).material.opacity = (1 - phase) * .23;
    });
    fish.current?.children.forEach((koi, i) => {
      const phase = clock.elapsedTime * .16 + i * 2.1;
      koi.position.set(Math.cos(phase) * (1.1 + i * .07), .145, Math.sin(phase) * 1.6);
      koi.rotation.y = Math.atan2(-Math.cos(phase) * 1.6, -Math.sin(phase) * 1.1);
    });
  });
  return <group position={[x, 0, z]}>
    <Timber position={[0, .04, 0]} size={[4.4, .12, 4.9]} color="#777b68"/>
    <mesh position={[0, .105, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[4, 4.5]}/><meshStandardMaterial color="#3e6961" roughness={1}/></mesh>
    <mesh position={[0, .18, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[4, 4.5]}/><meshStandardMaterial color="#73b8a9" metalness={.2} roughness={.18} transparent opacity={.55} depthWrite={false}/></mesh>
    <group ref={fish}>{[0, 1, 2].map(i => <group key={i}>
      <mesh scale={[.2, .025, .065]}><sphereGeometry args={[1, 10, 6]}/><meshStandardMaterial color={i === 1 ? '#e8a45f' : '#f3e7cf'} roughness={.45}/></mesh>
      <mesh position={[.03, .02, 0]} scale={[.085, .012, .05]}><sphereGeometry args={[1, 8, 6]}/><meshStandardMaterial color={i === 2 ? '#57534b' : '#d97844'} roughness={.5}/></mesh>
      <mesh position={[-.22, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, .3]}><coneGeometry args={[.065, .13, 4]}/><meshStandardMaterial color="#d99d72" roughness={.5}/></mesh>
    </group>)}</group>
    {[-1, 1].map(side => <group key={side}>
      <Timber position={[side * 2.12, .2, 0]} size={[.18, .25, 4.9]} color="#bdbea3"/>
      <Timber position={[0, .2, side * 2.36]} size={[4.4, .25, .18]} color="#bdbea3"/>
    </group>)}
    <Clusters items={planting}/>
    <mesh position={[-1.7, .42, -1.7]} scale={[.35, .5, .4]} castShadow><dodecahedronGeometry args={[1, 0]}/><meshStandardMaterial color="#8a9787" roughness={1}/></mesh>
    <mesh position={[-1.25, .71, -1.6]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.055, .065, .8, 8]}/><meshStandardMaterial color="#b1a478" roughness={.8}/></mesh>
    <mesh position={[-.85, .445, -1.6]}><cylinderGeometry args={[.013, .022, .53, 6]}/><meshStandardMaterial color="#c2e0d3" transparent opacity={.65} roughness={.15}/></mesh>
    <group ref={ripples} position={[-.85, .205, -1.6]}>{[0, 1, 2].map(i => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.35, .365, 40]}/><meshBasicMaterial color="#dce8c5" transparent opacity={.2} depthWrite={false}/></mesh>)}</group>
  </group>;
}

export function StoneGarden({ x, z }: { x: number; z: number }) {
  const pebbles = useMemo<Instance[]>(() => Array.from({ length: 32 }, (_, i) => ({
    at: [Math.sin(i * 2.4) * (1 + noise(i) * .2), .12, Math.cos(i * 2.4) * 1.35],
    scale: [.1 + noise(i) * .12, .07, .1], color: i % 2 ? '#c4c0a8' : '#8a9380', turn: i,
  })), []);
  return <group position={[x, 0, z]}>
    <mesh position={[0, .17, 0]} scale={[1.15, .14, 1.5]}><sphereGeometry args={[1, 16, 8]}/><meshStandardMaterial color="#b5b49a" roughness={1}/></mesh>
    <mesh position={[.18, .66, 0]} scale={[.45, .83, .53]} rotation={[.1, .4, -.12]} castShadow><dodecahedronGeometry args={[1, 0]}/><meshStandardMaterial color="#849083" roughness={1}/></mesh>
    <mesh position={[-.5, .36, .45]} scale={[.5, .4, .4]} castShadow><dodecahedronGeometry args={[1, 0]}/><meshStandardMaterial color="#9ba18b" roughness={1}/></mesh>
    <Clusters items={pebbles} stone/>
  </group>;
}

export function GardenFlowers() {
  const items = useMemo<Instance[]>(() => {
    const flowers: Instance[] = [];
    for (const side of [-1, 1]) for (let i = 0; i < 220; i++) {
      const bed = i < 140;
      const x = side * ((bed ? 9 : 21) + (noise(i * 7) - .5) * 1.9);
      const z = (bed ? 23 : 17) + (noise(i * 7 + 1) - .5) * (bed ? 6 : 4);
      flowers.push({ at: [x, .27, z], scale: [.17, .2 + noise(i + 3) * .2, .17], color: ['#657c47', '#839351', '#71854e'][i % 3] });
      if (i % 2) {
        const y = .55 + noise(i + 3) * .2;
        for (let petal = 0; petal < 5; petal++) {
          const a = petal / 5 * Math.PI * 2;
          flowers.push({ at: [x + Math.sin(a) * .075, y, z + Math.cos(a) * .075], scale: [.065, .035, .065], color: ['#f3e3b7', '#e8afc1', '#cab6d7', '#f9edda'][i % 4] });
        }
        flowers.push({ at: [x, y + .02, z], scale: [.04, .03, .04], color: '#d9b957' });
      }
    }
    return flowers;
  }, []);
  return <Clusters items={items}/>;
}

export function GardenBench({ x, z, turn = 0 }: { x: number; z: number; turn?: number }) {
  return <group position={[x, 0, z]} rotation={[0, turn, 0]}>
    {[-.85, .85].map(side => <Timber key={side} position={[side, .27, 0]} size={[.22, .54, .6]} color="#8c9180"/>)}
    {[-.19, 0, .19].map(offset => <Timber key={offset} position={[0, .57, offset]} size={[2.5, .12, .16]} color="#97734e"/>)}
    <Timber position={[0, 1, -.25]} size={[2.5, .35, .1]} color="#a28358"/>
  </group>;
}

export function DistantLandscape() {
  const hills = useMemo<Instance[]>(() => Array.from({ length: 16 }, (_, i) => {
    const turn = i / 16 * Math.PI * 2;
    return { at: [Math.sin(turn) * 62, -3, Math.cos(turn) * 64], scale: [13 + noise(i) * 9, 6 + noise(i + 7) * 6, 14], color: i % 2 ? '#9cab8d' : '#899f82' };
  }), []);
  const hedges = useMemo<Instance[]>(() => {
    const items: Instance[] = [];
    for (const side of [-1, 1]) for (let i = 0; i < 45; i++) {
      items.push({ at: [side * (27.8 + noise(i) * 2), .4, -10 + i * 1.2], scale: [.9, .7 + noise(i + 3) * .7, 1.1], color: ['#668056', '#76894e', '#849861'][i % 3] });
    }
    return items;
  }, []);
  return <><Clusters items={hills}/><Clusters items={hedges}/></>;
}

export function GardenSky() {
  const uniforms = useMemo(() => ({ topColor: { value: new THREE.Color('#a8c8d7') }, horizonColor: { value: new THREE.Color('#f0e7cf') } }), []);
  return <mesh frustumCulled={false}>
    <sphereGeometry args={[200, 24, 16]}/>
    <shaderMaterial side={THREE.BackSide} depthWrite={false} uniforms={uniforms}
      vertexShader="varying vec3 vDirection; void main(){vDirection=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}"
      fragmentShader={`
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        varying vec3 vDirection;
        void main() {
          float height = clamp(normalize(vDirection).y, 0.0, 1.0);
          vec3 sky = mix(horizonColor, topColor, pow(height, 0.5));
          float sun = max(dot(normalize(vDirection), normalize(vec3(0.45, 0.23, 1.0))), 0.0);
          sky += vec3(0.5, 0.31, 0.12) * pow(sun, 90.0) * 0.3;
          sky = mix(sky, vec3(1.0, 0.87, 0.61), smoothstep(0.99945, 0.9998, sun) * 0.9);
          gl_FragColor = vec4(sky, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `}/>
  </mesh>;
}
