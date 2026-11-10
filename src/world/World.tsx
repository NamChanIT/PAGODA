import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { layout } from './types';
import { gardenExitStep, moveOnGround } from './navigation.mjs';
import { Altar } from './Altar';
import { DonationBox } from './DonationBox';
import { Hall } from './Hall';
import { Character } from './Character';
import type { Correction, Player, Ritual, Seat } from './types';

type Props = {
  incense: boolean; onBell: () => void; onIncense: () => void; onDonation: () => void;
  name: string; ritual: Ritual; setRitual: (ritual: Ritual) => void;
  peers: Player[]; self: string; latest: MutableRefObject<Player | null>;
  correction: MutableRefObject<Correction | null>;
  direction: string; paused: boolean; cameraAngle: number; zoom: number;
  seat: Seat | null; onSeat: (seat: Seat) => void; onRelease: () => void;
  onAreaChange: (area: string) => void;
  walkingOutside: boolean; onGardenArrival: () => void;
};
export function World({ incense, onBell, onIncense, onDonation, name, ritual, setRitual, peers, self, latest, correction, direction, paused, cameraAngle, zoom, seat, onSeat, onRelease, onAreaChange, walkingOutside, onGardenArrival }: Props) {
  const player = useRef<Player>({ id: 'local', name, x: 0, z: layout.spawn.centerZ, yaw: Math.PI, ritual });
  const keys = useRef(new Set<string>());
  const cameraPosition = useRef(new THREE.Vector3());
  const movingLastFrame = useRef(false);
  const lastArea = useRef('');
  const exitRoute = useRef<{ stage: 'center' | 'exit'; centerZ: number } | null>(null);
  useEffect(() => { if (!walkingOutside) exitRoute.current = null; }, [walkingOutside]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && (e.target.closest('dialog') || e.target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName))) return;
      if (['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'].includes(e.key.toLowerCase())) {
        e.preventDefault(); keys.current.add(e.key.toLowerCase());
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const clear = () => keys.current.clear();
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    window.addEventListener('blur', clear); document.addEventListener('visibilitychange', clear);
    return () => {
      window.removeEventListener('keydown', down); window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', clear);
    };
  }, []);
  useEffect(() => { if (paused) keys.current.clear(); }, [paused]);
  useFrame(({ camera }, delta) => {
    const dt = document.hidden ? 0 : Math.min(delta, .2), p = player.current;
    p.name = name; p.ritual = ritual;
    const adjustment = correction.current;
    if (adjustment) {
      if (adjustment.reset) { p.x = adjustment.x; p.z = adjustment.z; onRelease(); if (!paused) setRitual('stand'); }
      else { p.x += adjustment.x; p.z += adjustment.z; }
      correction.current = null;
    }
    const k = keys.current;
    const horizontal = Number(k.has('d') || k.has('arrowright') || direction === 'd') - Number(k.has('a') || k.has('arrowleft') || direction === 'a');
    const vertical = Number(k.has('s') || k.has('arrowdown') || direction === 's') - Number(k.has('w') || k.has('arrowup') || direction === 'w');
    const manual = !!(horizontal || vertical) && !paused;
    let dx = 0, dz = 0;
    if (manual) {
      dx = horizontal * Math.cos(cameraAngle) + vertical * Math.sin(cameraAngle);
      dz = vertical * Math.cos(cameraAngle) - horizontal * Math.sin(cameraAngle);
      if (!movingLastFrame.current) { onRelease(); if (!paused) setRitual('stand'); }
      p.ritual = 'stand';
    } else if (!paused && walkingOutside) {
      // Keep the route stage when delayed server corrections arrive; do not
      // repeatedly send the visitor back to the centering waypoint.
      const confirmed = self ? peers.find(peer => peer.id === self) ?? null : p;
      const next = gardenExitStep(p, exitRoute.current, confirmed);
      exitRoute.current = next.route;
      dx = next.atGoal ? 0 : next.goal.x - p.x; dz = next.atGoal ? 0 : next.goal.z - p.z;
      if (next.arrived) onGardenArrival();
    } else if (!paused && seat) {
      dx = seat.x - p.x; dz = seat.z - p.z;
      if (Math.hypot(dx, dz) < .08) {
        dx = 0; dz = 0; p.yaw = Math.PI;
        if (ritual === 'stand') setRitual('sit');
      }
    }
    movingLastFrame.current = manual;
    if (dx || dz) {
      const length = Math.hypot(dx, dz), step = Math.min(3.4 * dt, manual ? Infinity : length);
      Object.assign(p, moveOnGround(p, { x: p.x + dx / length * step, z: p.z + dz / length * step }, layout.movement, layout.obstacles));
      p.yaw = Math.atan2(dx, dz); p.ritual = 'stand';
    }
    p.x = THREE.MathUtils.clamp(p.x, layout.movement.minX, layout.movement.maxX); p.z = THREE.MathUtils.clamp(p.z, layout.movement.minZ, layout.movement.maxZ);
    p.seatId = seat?.id ?? null;
    latest.current = { ...p };
    const area = Math.abs(p.x) < 12.5 && p.z < 19 ? 'Chính điện' :
      p.z > 39 ? 'Cổng tam quan' : Math.abs(p.x) > 21 && p.z < 10 ? 'Chòi an tịnh' :
      Math.abs(p.x) > 15 && p.z < 12 ? 'Vườn sen' : 'Sân vườn';
    if (area !== lastArea.current) { lastArea.current = area; onAreaChange(area); }
    cameraPosition.current.set(
      THREE.MathUtils.clamp(p.x + Math.sin(cameraAngle) * zoom, layout.camera.minX, layout.camera.maxX),
      2.9 + zoom * .1,
      THREE.MathUtils.clamp(p.z + Math.cos(cameraAngle) * zoom, layout.camera.minZ, layout.camera.maxZ),
    );
    camera.position.lerp(cameraPosition.current, 1 - Math.exp(-6 * dt));
    camera.lookAt(p.x - Math.sin(cameraAngle) * 1.3, 1.65, p.z - Math.cos(cameraAngle) * 1.3);
  });
  return <>
    <DonationBox onOpen={() => { if (!paused) onDonation(); }}/>
    <Altar incense={incense} onBell={() => { if (!paused) onBell(); }} onIncense={() => { if (!paused) onIncense(); }}/>
    <Hall occupied={peers.filter(p => p.id !== self).map(p => p.seatId).filter((id): id is number => typeof id === 'number')}
      selected={seat?.id ?? null} onSeat={chosen => { if (!paused) onSeat(chosen); }}/>
    <Character player={player.current} local/>
    {peers.filter(p => p.id !== self).map(p => <Character key={p.id} player={p}/>)}
  </>;
}
