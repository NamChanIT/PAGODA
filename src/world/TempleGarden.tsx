import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Inscription, Timber } from './TempleDecor';
import { DistantLandscape, GardenBench, GardenFlowers, LotusPond, OrnamentalTree, StoneGarden } from './GardenScenery';
function StoneLantern({ x, z }: { x: number; z: number }) {
  return <group position={[x, -.28, z]}>
    <Timber position={[0, .1, 0]} size={[.9, .2, .9]} color="#858579"/>
    <mesh position={[0, .7, 0]} castShadow><cylinderGeometry args={[.14, .23, 1.1, 8]}/><meshStandardMaterial color="#919083" roughness={1}/></mesh>
    <Timber position={[0, 1.27, 0]} size={[.76, .15, .76]} color="#9d9b8b"/>
    <mesh position={[0, 1.65, 0]}><boxGeometry args={[.44, .57, .44]}/><meshStandardMaterial color="#dfbe79" emissive="#d8a855" emissiveIntensity={.5}/></mesh>
    {[-1, 1].map(side => <group key={side}>{[-1, 1].map(front => <Timber key={front} position={[side * .27, 1.65, front * .27]} size={[.1, .65, .1]} color="#828376"/>)}</group>)}
    <mesh position={[0, 2.06, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[.7, .35, 4]}/><meshStandardMaterial color="#6e7668" roughness={.95}/></mesh>
    <mesh position={[0, 2.31, 0]}><sphereGeometry args={[.09, 10, 8]}/><meshStandardMaterial color="#818879"/></mesh>
  </group>;
}
function Pavilion({ x }: { x: number }) {
  return <group position={[x, -.3, 0]}>
    <Timber position={[0, .16, 0]} size={[7.8, .32, 8]} color="#99917b"/>
    {[-1, 1].map(side => <group key={side}>
      {[-2.8, 2.8].map(z => <mesh key={z} position={[side * 2.8, 1.95, z]} castShadow><cylinderGeometry args={[.16, .2, 3.5, 12]}/><meshStandardMaterial color="#71452f" roughness={.9}/></mesh>)}
      <mesh position={[side * 1.85, 4.25, 0]} rotation={[0, 0, -side * .27]} castShadow><boxGeometry args={[4.0, .2, 8.2]}/><meshStandardMaterial color="#65716a" roughness={.9}/></mesh>
      <Timber position={[side * 3.7, 3.72, 0]} size={[.14, .16, 8.3]} color="#a57b4b"/>
    </group>)}
    <GardenBench x={-2.2} z={-1.7} turn={Math.PI / 2}/>
    <GardenBench x={2.2} z={-1.7} turn={-Math.PI / 2}/>
    <group position={[0, 3.2, 0]}>
      <mesh><sphereGeometry args={[.28, 12, 8]}/><meshStandardMaterial color="#e8be7b" emissive="#c58738" emissiveIntensity={.7}/></mesh>
      <Timber position={[0, .6, 0]} size={[.03, .7, .03]} color="#6b5035"/>
    </group>
    <Timber position={[0, 4.84, 0]} size={[.2, .22, 8.4]} color="#9c7647"/>
    <group position={[0, 2.7, 4.12]}><Inscription text="CHÒI AN TỊNH" width={3} height={.48}/></group>
    {Array.from({ length: 20 }, (_, i) => <group key={i} position={[0, 0, -3.9 + i * .41]}>
      {[-1, 1].map(side => <mesh key={side} position={[side * 1.85, 4.38, 0]} rotation={[0, 0, -side * .27]}><boxGeometry args={[4.0, .06, .045]}/><meshStandardMaterial color="#899085" roughness={1}/></mesh>)}
    </group>)}
  </group>;
}
function GardenBed({ x, z, length = 5 }: { x: number; z: number; length?: number }) {
  return <group position={[x, 0, z]}>
    <Timber position={[0, .09, 0]} size={[2.6, .18, length]} color="#b4a58a"/>
    <Timber position={[0, .2, 0]} size={[2.35, .12, length - .25]} color="#596346"/>
    {Array.from({ length: Math.floor(length * 2) }, (_, i) => <group key={i} position={[Math.sin(i * 2.4) * .7, .37, (i / Math.max(1, Math.floor(length * 2) - 1) - .5) * (length - .7)]}>
      <mesh scale={[1, .65, 1]}><sphereGeometry args={[.38, 8, 6]}/><meshStandardMaterial color={i % 2 ? '#697e50' : '#81915b'}/></mesh>
      <mesh position={[0, .25, 0]}><sphereGeometry args={[.12, 8, 6]}/><meshStandardMaterial color={['#d6b17a', '#c89eac', '#ede0b8'][i % 3]}/></mesh>
    </group>)}
  </group>;
}
function GardenSign({ x, z, text }: { x: number; z: number; text: string }) {
  return <group position={[x, 0, z]}>
    <Timber position={[0, .65, 0]} size={[.12, 1.3, .12]} color="#654932"/>
    <group position={[0, 1.45, .08]}><Inscription text={text} width={2.2} height={.4}/></group>
  </group>;
}
function Garden() {
  const tiles = useRef<THREE.InstancedMesh>(null);
  const paving = useMemo(() => {
    const items: [number, number][] = [];
    for (let row = 0; row < 44; row++) for (let column = 0; column < 44; column++) {
      const x = (column - 21.5) * 1.25, z = row * 1.25 - 14;
      // Keep planted islands between the central courtyard and the outer loop.
      const planted = (Math.abs(x) > 7.2 && Math.abs(x) < 11 && z > 19 && z < 27) || Math.abs(x) > 24.5 || (z > 34.5 && Math.abs(x) > 6);
      if (!(Math.abs(x) < 10.2 && z < 14) && !planted) items.push([x, z]);
    }
    return items;
  }, []);
  const stoneTexture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#e9e5db'; ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 1600; i++) {
      ctx.fillStyle = i % 2 ? '#54493810' : '#ffffff30';
      ctx.fillRect((i * 71.17) % 128, (i * 43.39) % 128, 1.5, 1.5);
    }
    ctx.strokeStyle = '#ffffff45'; ctx.strokeRect(2, 2, 124, 124);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; return map;
  }, []);
  useEffect(() => () => stoneTexture.dispose(), [stoneTexture]);
  useLayoutEffect(() => {
    if (!tiles.current) return;
    const matrix = new THREE.Matrix4(), color = new THREE.Color();
    paving.forEach(([x, z], i) => {
      matrix.makeTranslation(x, -.055, z); tiles.current!.setMatrixAt(i, matrix);
      color.set(Math.abs(x) < 3.2 && z > 14 ? '#d1c9ae' : Math.abs(x) < 4.1 && z > 14 ? '#8c927d' : ['#b5a58b', '#bdad93', '#b9aa91', '#afa18a'][i % 4]); tiles.current!.setColorAt(i, color);
    });
    tiles.current.instanceMatrix.needsUpdate = true;
    if (tiles.current.instanceColor) tiles.current.instanceColor.needsUpdate = true;
    tiles.current.computeBoundingSphere();
  }, [paving]);
  return <group>
    <DistantLandscape/>
    <GardenFlowers/>
    <mesh position={[0, -.07, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[180, 180]}/><meshStandardMaterial color="#829267" roughness={1}/></mesh>
    <instancedMesh ref={tiles} args={[undefined, undefined, paving.length]} receiveShadow><boxGeometry args={[1.22, .12, 1.22]}/><meshStandardMaterial map={stoneTexture} roughness={.98}/></instancedMesh>
    <Timber position={[0, -.02, 14.1]} size={[20, .06, 1.2]} color="#b5a68c"/>
    <GardenSign x={4.7} z={19} text="CHÍNH ĐIỆN · LỐI VÀO"/>
    {[-1, 1].map(side => <group key={side}>
      <Pavilion x={side * 19}/>
      {[-10, 7, 17, 27, 35].map((z, i) => <OrnamentalTree key={z} x={side * 11.2} z={z} scale={i % 2 ? .9 : 1.1} flowering={i === 2 || i === 4}/>)}
      {[-5, 5, 15, 25, 35].map((z, i) => <OrnamentalTree key={`outer-${z}`} x={side * 26.7} z={z} scale={1 + i % 2 * .2}/>)}
      <GardenBed x={side * 9} z={23} length={7}/>
      <GardenBed x={side * 21} z={17} length={5}/>
      <GardenSign x={side * 22} z={10} text="HỒ SEN · CHÒI NGHỈ"/>
      <GardenSign x={side * 9} z={30} text="LỐI DẠO AN YÊN"/>
      {[15, 22, 29].map(z => <StoneLantern key={z} x={side * 5.8} z={z}/>)}
      {[-9, 7].map(z => <StoneLantern key={z} x={side * 11.7} z={z}/>)}
      <LotusPond x={side * 14} z={-3}/>
      <StoneGarden x={side * 9} z={23}/>
      {/* Low perimeter wall leaves the central gate and all walking loops open. */}
      <Timber position={[side * 27, .25, 15]} size={[.3, .6, 46]} color="#a89c80"/>
      <Timber position={[side * 16, .25, 37]} size={[22, .6, .3]} color="#a89c80"/>
    </group>)}
    {/* Gateway frames the view from the entrance of the hall. */}
    <group position={[0, -.3, 31]}>
      {[-4, 4].map(x => <Timber key={x} position={[x, 2.1, 0]} size={[.6, 4.2, .6]} color="#a3977f"/>)}
      <group position={[0, 3.25, -.45]} rotation={[0, Math.PI, 0]}><Inscription text="AN YÊN" width={3} height={.7}/></group>
      <group position={[0, 3.25, .45]}><Inscription text="AN YÊN" width={3} height={.7}/></group>
      <Timber position={[0, 4.9, 0]} size={[10.3, .14, .16]} color="#ae9670"/>
      <Timber position={[0, 4.1, 0]} size={[9.2, .4, .8]} color="#6b422e"/>
      {[-1, 1].map(side => <mesh key={side} position={[0, 4.43, side * .65]} rotation={[-side * .4, 0, 0]} castShadow><boxGeometry args={[10.2, .16, 1.7]}/><meshStandardMaterial color="#65716a" roughness={.85}/></mesh>)}
    </group>
  </group>;
}
export const TempleGarden = memo(Garden);
