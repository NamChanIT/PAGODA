import { Html } from '@react-three/drei';

export function DonationBox({ onOpen }: { onOpen: () => void }) {
  return <group position={[4.6, 0, -3.2]} onClick={event => {
    event.stopPropagation();
    if (event.delta < 5) onOpen();
  }}>
    <mesh position={[0, .12, 0]} receiveShadow castShadow><boxGeometry args={[1.35, .24, 1]}/><meshStandardMaterial color="#493022"/></mesh>
    <mesh position={[0, .85, 0]} castShadow><boxGeometry args={[1.12, 1.25, .8]}/><meshStandardMaterial color="#8d3428" roughness={.65}/></mesh>
    <mesh position={[0, 1.52, 0]} castShadow><boxGeometry args={[1.28, .12, .94]}/><meshStandardMaterial color="#b8934e" metalness={.45} roughness={.4}/></mesh>
    <mesh position={[0, 1.585, 0]}><boxGeometry args={[.55, .012, .075]}/><meshStandardMaterial color="#201912"/></mesh>
    <mesh position={[0, .93, .407]}><boxGeometry args={[.91, .51, .025]}/><meshStandardMaterial color="#c8a35d" metalness={.35} roughness={.5}/></mesh>
    <Html center position={[0, 1.95, 0]} distanceFactor={10} zIndexRange={[8, 0]}>
      <button className="donation-label" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); onOpen(); }}>Hòm công đức</button>
    </Html>
  </group>;
}
