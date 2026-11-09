import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
function OfferingStand({ width, depth, height }: { width: number; depth: number; height: number }) {
  return <group>
    <mesh position={[0, height - .07, 0]} castShadow><boxGeometry args={[width, .14, depth]}/><meshStandardMaterial color="#67422b" roughness={.85}/></mesh>
    <mesh position={[0, height - .25, 0]}><boxGeometry args={[width - .18, .22, depth - .2]}/><meshStandardMaterial color="#825b35" roughness={.9}/></mesh>
    {[-1, 1].map(side => <group key={side}>{[-1, 1].map(front => <mesh key={front} position={[side * (width / 2 - .16), (height - .2) / 2, front * (depth / 2 - .15)]} castShadow><boxGeometry args={[.12, height - .2, .12]}/><meshStandardMaterial color="#543422" roughness={.85}/></mesh>)}</group>)}
    <mesh position={[0, .08, 0]}><boxGeometry args={[width - .08, .12, depth - .1]}/><meshStandardMaterial color="#4c3224" roughness={.9}/></mesh>
  </group>;
}
export function Altar({ incense, onBell, onIncense }: { incense: boolean; onBell: () => void; onIncense: () => void }) {
  const smoke = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    smoke.current?.children.forEach((puff, index) => {
      const progress = (clock.elapsedTime * .16 + index / 14) % 1;
      puff.position.set(Math.sin(progress * 7 + index) * .12, 1.94 + progress * 1.6, Math.cos(progress * 5 + index) * .1);
      puff.scale.setScalar(.05 + progress * .19);
      (puff as THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>).material.opacity = (1 - progress) * .17;
    });
  });
  return <group position={[0, 0, -6.4]}>
    <group position={[-2.4, 0, 0]} onClick={event => { event.stopPropagation(); if (event.delta < 5) onBell(); }}>
      <OfferingStand width={1.1} depth={1} height={1.1}/>
      <mesh position={[0, 1.56, 0]} castShadow><sphereGeometry args={[.48, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]}/><meshStandardMaterial color="#b79546" metalness={.65} roughness={.3} side={THREE.DoubleSide}/></mesh>
      <mesh position={[0, 1.56, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[.48, .025, 8, 32]}/><meshStandardMaterial color="#c5a45e" metalness={.6} roughness={.35}/></mesh>
      <mesh position={[.64, 1.4, 0]} rotation={[0, 0, -.3]}><capsuleGeometry args={[.07, .7, 4, 10]}/><meshStandardMaterial color="#573a25"/></mesh>
    </group>
    <group onClick={event => { event.stopPropagation(); if (event.delta < 5) onIncense(); }}>
      <OfferingStand width={1.45} depth={1.1} height={1.15}/>
      <mesh position={[0, 1.17, 0]}><latheGeometry args={[[new THREE.Vector2(0, 0), new THREE.Vector2(.19, 0), new THREE.Vector2(.27, .08), new THREE.Vector2(.32, .25), new THREE.Vector2(.34, .28)], 32]}/><meshStandardMaterial color="#a17c3d" metalness={.6} roughness={.4} side={THREE.DoubleSide}/></mesh>
      {[-1, 1].map(side => <mesh key={side} position={[side * .36, 1.4, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[.1, .022, 8, 20]}/><meshStandardMaterial color="#b08c48" metalness={.6} roughness={.4}/></mesh>)}
      {[-.1, 0, .1].map(x => <group key={x}>
        <mesh position={[x, 1.65, 0]}><cylinderGeometry args={[.012, .012, .55, 6]}/><meshStandardMaterial color="#6f3222"/></mesh>
        <mesh position={[x, 1.93, 0]}><sphereGeometry args={[.018, 8, 6]}/><meshBasicMaterial color={incense ? '#ff943c' : '#6f3222'}/></mesh>
      </group>)}
      <group ref={smoke} visible={incense}>{Array.from({ length: 14 }, (_, i) => <mesh key={i}><sphereGeometry args={[1, 8, 6]}/><meshBasicMaterial color="#ddd8cb" transparent depthWrite={false}/></mesh>)}</group>
    </group>
  </group>;
}
