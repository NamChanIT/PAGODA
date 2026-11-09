import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Timber } from './TempleDecor';
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
function GardenTree({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return <group position={[x, -.3, z]} scale={scale}>
    <mesh position={[0, 2, 0]} rotation={[0, 0, -.08]} castShadow><cylinderGeometry args={[.12, .29, 4, 10]}/><meshStandardMaterial color="#665342" roughness={1}/></mesh>
    {[0, 1, 2, 3, 4].map(i => <mesh key={i} position={[Math.sin(i * 2.4) * 1.1, 3.2 + i * .35, Math.cos(i * 2.4) * 1.1]} scale={[1.35, .65, 1]} castShadow><sphereGeometry args={[1.4, 12, 10]}/><meshStandardMaterial color={i % 2 ? '#4f6647' : '#63774e'} roughness={1}/></mesh>)}
  </group>;
}
function Pavilion({ x }: { x: number }) {
  return <group position={[x, -.3, 0]}>
    <Timber position={[0, .16, 0]} size={[7.8, .32, 8]} color="#99917b"/>
    {[-1, 1].map(side => <group key={side}>
      {[-2.8, 2.8].map(z => <mesh key={z} position={[side * 2.8, 1.95, z]} castShadow><cylinderGeometry args={[.16, .2, 3.5, 12]}/><meshStandardMaterial color="#71452f" roughness={.9}/></mesh>)}
      <mesh position={[side * 1.85, 4.25, 0]} rotation={[0, 0, -side * .27]} castShadow><boxGeometry args={[4.0, .2, 8.2]}/><meshStandardMaterial color="#6d4331" roughness={.9}/></mesh>
      <Timber position={[side * 3.7, 3.72, 0]} size={[.14, .16, 8.3]} color="#a57b4b"/>
    </group>)}
    <Timber position={[0, 4.84, 0]} size={[.2, .22, 8.4]} color="#9c7647"/>
    {Array.from({ length: 20 }, (_, i) => <group key={i} position={[0, 0, -3.9 + i * .41]}>
      {[-1, 1].map(side => <mesh key={side} position={[side * 1.85, 4.38, 0]} rotation={[0, 0, -side * .27]}><boxGeometry args={[4.0, .06, .045]}/><meshStandardMaterial color="#936448" roughness={1}/></mesh>)}
    </group>)}
  </group>;
}
function Garden() {
  const tiles = useRef<THREE.InstancedMesh>(null);
  const paving = useMemo(() => {
    const items: [number, number][] = [];
    for (let row = 0; row < 38; row++) for (let column = 0; column < 44; column++) {
      const x = (column - 21.5) * 1.25, z = row * 1.25 - 14;
      if (!(Math.abs(x) < 10.2 && z < 14)) items.push([x, z]);
    }
    return items;
  }, []);
  useLayoutEffect(() => {
    if (!tiles.current) return;
    const matrix = new THREE.Matrix4(), color = new THREE.Color();
    paving.forEach(([x, z], i) => {
      matrix.makeTranslation(x, -.34, z); tiles.current!.setMatrixAt(i, matrix);
      color.set(['#996c53', '#a4795b', '#8b634d', '#a07a60'][i % 4]); tiles.current!.setColorAt(i, color);
    });
    tiles.current.instanceMatrix.needsUpdate = true;
    if (tiles.current.instanceColor) tiles.current.instanceColor.needsUpdate = true;
    tiles.current.computeBoundingSphere();
  }, [paving]);
  return <group>
    <mesh position={[0, -.46, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[180, 180]}/><meshStandardMaterial color="#6e7957" roughness={1}/></mesh>
    <instancedMesh ref={tiles} args={[undefined, undefined, paving.length]} receiveShadow><boxGeometry args={[1.22, .12, 1.22]}/><meshStandardMaterial roughness={.98}/></instancedMesh>
    {[0, 1, 2].map(i => <Timber key={i} position={[0, -.08 - i * .08, 14 + i * .55]} size={[20 + i * .35, .16, .65]} color="#aaa08a"/>)}
    {[-1, 1].map(side => <group key={side}>
      <Pavilion x={side * 19}/>
      {[-10, 7, 17, 27].map((z, i) => <GardenTree key={z} x={side * (14 + i % 2 * 2)} z={z} scale={i % 2 ? .9 : 1.1}/>)}
      {[15, 22, 29].map(z => <StoneLantern key={z} x={side * 5.8} z={z}/>)}
      {[-9, 7].map(z => <StoneLantern key={z} x={side * 11.7} z={z}/>)}
      {/* Raised lotus pond: quiet green water, stone border and floating leaves. */}
      <group position={[side * 14, -.25, -3]}>
        <Timber position={[0, -.02, 0]} size={[4.4, .2, 4.9]} color="#8c907b"/>
        <mesh position={[0, .095, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[4, 4.5]}/><meshStandardMaterial color="#4c7062" metalness={.25} roughness={.26}/></mesh>
        {Array.from({ length: 9 }, (_, i) => <group key={i} position={[Math.sin(i * 2.4) * 1.45, .11, Math.cos(i * 2.4) * 1.65]}>
          <mesh rotation={[-Math.PI / 2, 0, i]}><circleGeometry args={[.22 + i % 3 * .07, 16, .15, Math.PI * 1.87]}/><meshStandardMaterial color="#7a8b57" side={THREE.DoubleSide} roughness={.9}/></mesh>
          {i % 3 === 0 && <mesh position={[.1, .07, 0]} scale={[1, .55, 1]}><sphereGeometry args={[.11, 12, 8]}/><meshStandardMaterial color="#d4b3a1"/></mesh>}
        </group>)}
      </group>
      <Timber position={[side * 11, .15, 21]} size={[.18, 1.2, 19]} color="#a89c80"/>
    </group>)}
    {/* Gateway frames the view from the entrance of the hall. */}
    <group position={[0, -.3, 31]}>
      {[-4, 4].map(x => <Timber key={x} position={[x, 2.1, 0]} size={[.6, 4.2, .6]} color="#a3977f"/>)}
      <Timber position={[0, 4.1, 0]} size={[9.2, .4, .8]} color="#6b422e"/>
      {[-1, 1].map(side => <mesh key={side} position={[0, 4.43, side * .65]} rotation={[-side * .4, 0, 0]} castShadow><boxGeometry args={[10.2, .16, 1.7]}/><meshStandardMaterial color="#7d5039" roughness={.85}/></mesh>)}
    </group>
  </group>;
}
export const TempleGarden = memo(Garden);
