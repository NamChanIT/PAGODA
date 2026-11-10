import { useMemo } from 'react';
import * as THREE from 'three';
import { TempleDecor } from './TempleDecor';
import { TempleGarden } from './TempleGarden';
import { GardenSky } from './GardenScenery';
import { BuddhaStatue } from './BuddhaStatue';
import { seats, layout } from './types';
import type { Seat } from './types';
import { useEffect } from 'react';
function Block({ at, size, color = '#36251f' }: { at: [number, number, number]; size: [number, number, number]; color?: string }) {
  return <mesh position={at} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={.8}/></mesh>;
}
export function Hall({ onSeat, occupied, selected }: { onSeat: (seat: Seat) => void; occupied: number[]; selected: number | null }) {
  const timber = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#78604a'; ctx.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 400; i++) {
      const x = (i * 71.17) % 256; ctx.strokeStyle = i % 3 ? '#291d1718' : '#ba987718';
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x + 12, 180, x - 16, 350, x + 4, 512); ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
  }, []);
  useEffect(() => () => timber.dispose(), [timber]);
  return <>
    <group scale={layout.architectureScale as [number, number, number]}><TempleGarden/><TempleDecor/></group>
    <GardenSky/>
    <color attach="background" args={['#e2e3d1']}/><fog attach="fog" args={['#e2e3d1', 55, 135]}/>
    <ambientLight intensity={.65}/><hemisphereLight args={['#f5e7c7', '#292325', 1.5]}/>
    <directionalLight position={[-25, 35, 18]} color="#fff0d0" intensity={2.4} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-52} shadow-camera-right={52} shadow-camera-top={52} shadow-camera-bottom={-52} shadow-camera-far={120} shadow-bias={-.0003} shadow-normalBias={.04}/>
    <pointLight position={[0, 8, -10]} color="#ffd18a" intensity={65} distance={24}/>
    <pointLight position={[0, 5.7, -3.5]} color="#fff1d6" intensity={45} distance={24}/>
    <group scale={layout.architectureScale as [number, number, number]}>

    {Array.from({ length: 30 }, (_, i) => <mesh key={i} position={[(i - 14.5) * .64, -.06, 0]} receiveShadow><boxGeometry args={[.625, .12, 28]}/><meshStandardMaterial map={timber} color={i % 3 ? '#a18a70' : '#88715c'}/></mesh>)}
    <Block at={[0, 3.8, -12]} size={[20, 7.6, .4]} color="#b1a38a"/>
    {[-1, 1].map(side => <mesh key={`roof-${side}`} position={[side * 4.8, 8.05, 0]} rotation={[0, 0, -side * .16]} castShadow><boxGeometry args={[10.1, .2, 28]}/><meshStandardMaterial color="#35261f" roughness={.95}/></mesh>)}
    {[-12, -7, -2, 3, 8, 13].map(z => <group key={`beam-${z}`}>
      <Block at={[0, 7.05, z]} size={[19.5, .3, .26]} color="#4b3023"/>
      <Block at={[0, 8.8, z]} size={[.18, .3, .26]} color="#6d4a31"/>
    </group>)}
    {[-9.5, 9.5].map(side => <group key={side}>
      <Block at={[side, 1, 0]} size={[.3, 2, 28]} color="#a8997f"/>
      {[-12, -7, -2, 3, 8, 13].map(z => <group key={z}>
        <Block at={[side, 3.8, z]} size={[.42, 7.6, .42]}/>

      </group>)}
      {[2.2, 5.6, 6.3, 7].map(y => <Block key={y} at={[side, y, 0]} size={[.2, .12, 28]}/>)}
      {Array.from({ length: 45 }, (_, i) => <Block key={i} at={[side, 6.15, -13.5 + i * .61]} size={[.15, 2, .07]}/>)}
    </group>)}
    </group>
    <Block at={[0, .3, -11.6]} size={[23, .6, 8]} color="#39241c"/>
    <Block at={[0, .7, -12]} size={[21, .25, 6.4]} color="#543528"/>
    {[-5.1, 0, 5.1].map(x => {
      const central = x === 0;
      const base = central ? 1.8 : 1.5;
      return <group key={`buddha-${x}`} name={central ? 'central-buddha' : `side-buddha-${x}`}>
        <Block at={[x, (base + .825) / 2, -10.2]} size={[central ? 4.6 : 4.1, base - .825, 3.2]} color="#543528"/>
        <group position={[x, base, -10.2]} scale={central ? 1.4 : 1.22}><BuddhaStatue/></group>
      </group>;
    })}
    <mesh position={[0, 5, -15.8]}><planeGeometry args={[20, 7.8]}/><meshStandardMaterial color="#294137" roughness={.9}/></mesh>
    {seats.map((seat, i) => <group key={i} position={[seat.x, 0, seat.z]} onClick={event => { event.stopPropagation(); if (event.delta < 5 && !occupied.includes(i)) onSeat(seat); }}>
      <Block at={[0, .12, 0]} size={[1.65, .24, 1.65]} color="#50574a"/>
      <Block at={[0, .25, 0]} size={[1.47, .06, 1.47]} color={occupied.includes(i) ? "#8b6652" : selected === i ? "#bfa572" : "#71755c"}/>
    </group>)}
  </>;
}
