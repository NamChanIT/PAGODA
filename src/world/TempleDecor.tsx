import { memo, useEffect, useMemo } from 'react';
import * as THREE from 'three';

export function Timber({ position, size, color = '#502f24' }: { position: [number, number, number]; size: [number, number, number]; color?: string }) {
  return <mesh position={position} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={.85}/></mesh>;
}
function Inscription({ text, width, height, vertical = false }: { text: string; width: number; height: number; vertical?: boolean }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = vertical ? 256 : 1024; canvas.height = vertical ? 1024 : 256;
    const ctx = canvas.getContext('2d'); if (!ctx) return null;
    ctx.fillStyle = '#42231c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#c1a067'; ctx.lineWidth = 5; ctx.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);
    ctx.lineWidth = 1; ctx.strokeRect(22, 22, canvas.width - 44, canvas.height - 44);
    ctx.fillStyle = '#e0c48b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (vertical) {
      const words = text.split(' '); ctx.font = 'bold 47px Georgia, serif';
      words.forEach((word, i) => ctx.fillText(word, 128, 110 + i * (canvas.height - 220) / (words.length - 1), 210));
    } else { ctx.font = 'bold 86px Georgia, serif'; ctx.fillText(text, 512, 138, 910); }
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; return map;
  }, [text, vertical]);
  useEffect(() => () => texture?.dispose(), [texture]);
  return <mesh><planeGeometry args={[width, height]}/><meshStandardMaterial map={texture ?? undefined} color="#fff5de" roughness={.85}/></mesh>;
}
function Vase({ x, z }: { x: number; z: number }) {
  return <group position={[x, 1.65, z]}>
    <mesh castShadow><latheGeometry args={[[new THREE.Vector2(0, 0), new THREE.Vector2(.17, 0), new THREE.Vector2(.21, .13), new THREE.Vector2(.22, .3), new THREE.Vector2(.12, .46), new THREE.Vector2(.105, .62), new THREE.Vector2(.14, .66)], 24]}/><meshStandardMaterial color="#d7dcce" roughness={.3}/></mesh>
    {[0, 1, 2, 3, 4].map(i => <group key={i} position={[Math.sin(i * 2) * .16, .57, Math.cos(i * 2) * .13]}>
      <mesh position={[0, .32, 0]} rotation={[0, 0, Math.sin(i) * .18]}><cylinderGeometry args={[.012, .014, .65, 6]}/><meshStandardMaterial color="#61744b"/></mesh>
      <mesh position={[0, .64 + i % 2 * .08, 0]}><sphereGeometry args={[.055, 12, 8]}/><meshStandardMaterial color="#bd9547"/></mesh>
      {Array.from({ length: 7 }, (_, j) => <mesh key={j} position={[Math.sin(j / 7 * Math.PI * 2) * .09, .64 + i % 2 * .08 + Math.cos(j / 7 * Math.PI * 2) * .09, 0]} scale={[1, 1.7, .5]} rotation={[0, 0, -j / 7 * Math.PI * 2]}><sphereGeometry args={[.058, 10, 8]}/><meshStandardMaterial color={i % 2 ? '#d9b86c' : '#f0dfb5'} roughness={.85}/></mesh>)}
    </group>)}
  </group>;
}
function Candle({ x, z }: { x: number; z: number }) {
  return <group position={[x, 1.65, z]}>
    <mesh position={[0, .025, 0]}><cylinderGeometry args={[.17, .19, .05, 20]}/><meshStandardMaterial color="#a18045" metalness={.5} roughness={.5}/></mesh>
    <mesh position={[0, .2, 0]}><cylinderGeometry args={[.085, .1, .35, 20]}/><meshStandardMaterial color="#c59964" roughness={.9}/></mesh>
    <mesh position={[0, .44, 0]} scale={[.55, 1.5, .55]}><sphereGeometry args={[.045, 12, 8]}/><meshBasicMaterial color="#ffe0a2"/></mesh>
  </group>;
}
function Decor() {
  return <group>
    <group position={[0, 6.65, -10.8]}>
      <Timber position={[0, 0, -.12]} size={[5.8, 1.05, .18]} color="#3c211b"/>
      <Inscription text="CHÙA AN YÊN" width={5.5} height={.87}/>
    </group>
    {[-1, 1].map(side => <group key={side}>
      <group position={[side * 6.3, 3.7, -8.3]}><Inscription text={side < 0 ? 'GIỮ TÂM AN TỊNH' : 'NUÔI DƯỠNG TỪ BI'} width={.65} height={3.7} vertical/></group>
      {[-10, -3, 4, 11].map(z => <group key={z} position={[side * 8.65, 0, z]}>
        <mesh position={[0, .2, 0]} receiveShadow><cylinderGeometry args={[.43, .48, .4, 12]}/><meshStandardMaterial color="#9b9482" roughness={.95}/></mesh>
        <mesh position={[0, 3.45, 0]} castShadow><cylinderGeometry args={[.25, .31, 6.5, 20]}/><meshStandardMaterial color="#63372a" roughness={.75}/></mesh>
        {[.48, 6.4].map(y => <mesh key={y} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[.29, .025, 6, 20]}/><meshStandardMaterial color="#b19355" metalness={.4} roughness={.6}/></mesh>)}
        <Timber position={[-side * .4, 6.5, 0]} size={[1.3, .18, .5]} color="#74442e"/>
        <Timber position={[-side * .2, 6.25, 0]} size={[.7, .2, .36]} color="#583424"/>
      </group>)}
      {/* Framed altar panels and low offering tables. */}
      <Timber position={[side * 5.7, 4, -11.3]} size={[.11, 5.25, .13]} color="#b09359"/>
      <Timber position={[side * 6.4, 1.49, -7.35]} size={[2.6, .26, 1.05]} color="#583021"/>
      <Timber position={[side * 6.4, 1.25, -6.82]} size={[2.3, .25, .08]} color="#795137"/>
      {[-.9, .9].map(offset => <Timber key={offset} position={[side * 6.4 + offset, .98, -7.35]} size={[.16, .9, .68]} color="#42281d"/>)}
      <Vase x={side * 7.05} z={-7.35}/><Candle x={side * 5.8} z={-7.22}/>
      <mesh position={[side * 6.45, 1.68, -7.1]}><cylinderGeometry args={[.3, .22, .07, 24]}/><meshStandardMaterial color="#c9ad6e" metalness={.45} roughness={.5}/></mesh>
      {[0, 1, 2, 3].map(i => <mesh key={i} position={[side * 6.45 + Math.sin(i * 2.4) * .13, 1.79 + (i === 3 ? .13 : 0), -7.1 + Math.cos(i * 2.4) * .1]}><sphereGeometry args={[.12, 14, 10]}/><meshStandardMaterial color="#bd7d36" roughness={.8}/></mesh>)}
      {/* Small lanterns hang over the side aisles, above the camera. */}
      {[-6, 2, 10].map(z => <group key={z} position={[side * 7.5, 5.7, z]}>
        <mesh position={[0, .65, 0]}><cylinderGeometry args={[.012, .012, .6, 6]}/><meshStandardMaterial color="#35261c"/></mesh>
        <mesh scale={[1, 1.25, 1]}><sphereGeometry args={[.28, 12, 12]}/><meshStandardMaterial color="#b87e43" emissive="#ba6d2f" emissiveIntensity={.4} roughness={.85}/></mesh>
        {[-.28, .28].map(y => <mesh key={y} position={[0, y, 0]}><cylinderGeometry args={[.14, .14, .08, 12]}/><meshStandardMaterial color="#4c3022"/></mesh>)}
        <mesh position={[0, -.45, 0]}><coneGeometry args={[.05, .25, 8]}/><meshStandardMaterial color="#a6713c"/></mesh>
      </group>)}
    </group>)}
    {[-5.8, 5.8].map(x => <Timber key={x} position={[x, 3.3, 12.8]} size={[.4, 6.6, .4]}/>)}
    <Timber position={[0, 6.4, 12.8]} size={[19, .45, .45]}/>
    {[-1, 1].map(side => <group key={side} position={[side * 7.6, 0, 12.8]}>
      <Timber position={[0, 2.8, 0]} size={[3, 5.6, .15]} color="#5a3525"/>
      {[-.9, 0, .9].map(x => <Timber key={x} position={[x, 3.7, .1]} size={[.045, 2.7, .05]} color="#9c794b"/>)}
      <Timber position={[0, 2, .1]} size={[2.7, .07, .05]} color="#9c794b"/>
    </group>)}
  </group>;
}
export const TempleDecor = memo(Decor);
