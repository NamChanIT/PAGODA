import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function CurvedRoof({ width, depth, rise, y = 0 }: { width: number; depth: number; rise: number; y?: number }) {
  const geometry = useMemo(() => {
    const height = (x: number, z: number) => {
      const u = Math.abs(x) / (width / 2), v = Math.abs(z) / (depth / 2);
      return rise * (1 - v) + .25 * v ** 3 + .35 * u ** 8 * v ** 2 + .12 * u ** 8;
    };
    const positions: number[] = [], indices: number[] = [];
    for (let row = 0; row <= 16; row++) for (let column = 0; column <= 32; column++) {
      const x = (column / 32 - .5) * width, z = (row / 16 - .5) * depth;
      positions.push(x, height(x, z), z);
      if (row < 16 && column < 32) { const i = row * 33 + column; indices.push(i, i + 33, i + 1, i + 1, i + 33, i + 34); }
    }
    const roof = new THREE.BufferGeometry(); roof.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); roof.setIndex(indices); roof.computeVertexNormals();
    const ribs = Array.from({ length: 29 }, (_, i) => {
      const x = (i / 28 - .5) * width;
      const points = Array.from({ length: 17 }, (_, j) => { const z = (j / 16 - .5) * depth; return new THREE.Vector3(x, height(x, z) + .025, z); });
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, .027, 4, false);
    });
    const seams = mergeGeometries(ribs); ribs.forEach(g => g.dispose());
    const lines = [-1, 0, 1].map(side => {
      const z = side * depth / 2;
      const points = Array.from({ length: 25 }, (_, i) => { const x = (i / 24 - .5) * width; return new THREE.Vector3(x, height(x, z) + .04, z); });
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, side ? .055 : .09, 6, false);
    });
    const trim = mergeGeometries(lines); lines.forEach(g => g.dispose());
    return { roof, seams, trim };
  }, [width, depth, rise]);
  useEffect(() => () => Object.values(geometry).forEach(g => g.dispose()), [geometry]);
  return <group position={[0, y, 0]}>
    <mesh geometry={geometry.roof} castShadow receiveShadow><meshStandardMaterial color="#415d59" side={THREE.DoubleSide} roughness={.85}/></mesh>
    <mesh geometry={geometry.seams}><meshStandardMaterial color="#73847a" roughness={.9}/></mesh>
    <mesh geometry={geometry.trim}><meshStandardMaterial color="#b49d6e" roughness={.72}/></mesh>
    {[-1, 1].map(side => <mesh key={side} position={[side * width / 2, rise + .34, 0]} rotation={[0, 0, -side * .35]} castShadow><coneGeometry args={[.1, .55, 7]}/><meshStandardMaterial color="#baa77b" roughness={.7}/></mesh>)}
  </group>;
}

export function BambooGrove({ x, z, seed = 1 }: { x: number; z: number; seed?: number }) {
  const stems = useRef<THREE.InstancedMesh>(null), leaves = useRef<THREE.InstancedMesh>(null), joints = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!stems.current || !leaves.current || !joints.current) return;
    const object = new THREE.Object3D(), color = new THREE.Color();
    for (let i = 0; i < 15; i++) {
      const angle = i * 2.4 + seed, radius = Math.sqrt(i / 15) * 1.3, height = 3.5 + Math.sin(i * 7 + seed) * .8;
      const x = Math.sin(angle) * radius, z = Math.cos(angle) * radius;
      object.position.set(x, height / 2, z); object.rotation.set(0, angle, Math.sin(i) * .045); object.scale.set(.055, height, .055); object.updateMatrix();
      stems.current.setMatrixAt(i, object.matrix); stems.current.setColorAt(i, color.set(i % 2 ? '#6f8752' : '#879957'));
      for (let j = 0; j < 4; j++) {
        object.position.set(x, .5 + j * .75, z); object.rotation.set(0, 0, 0); object.scale.set(.067, .018, .067); object.updateMatrix(); joints.current.setMatrixAt(i * 4 + j, object.matrix);
      }
      for (let j = 0; j < 8; j++) {
        const a = angle + j * 2.4, spread = .3 + j % 3 * .16;
        object.position.set(x + Math.sin(a) * spread, height - .3 - j % 3 * .4, z + Math.cos(a) * spread);
        object.rotation.set(.25, a, .2); object.scale.set(.07, .035, .48); object.updateMatrix();
        leaves.current.setMatrixAt(i * 8 + j, object.matrix); leaves.current.setColorAt(i * 8 + j, color.set(j % 2 ? '#587c4b' : '#8caa63'));
      }
    }
    for (const mesh of [stems.current, leaves.current, joints.current]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [seed]);
  return <group position={[x, 0, z]}>
    <instancedMesh ref={stems} args={[undefined, undefined, 15]} castShadow><cylinderGeometry args={[1, 1, 1, 6]}/><meshStandardMaterial roughness={.8}/></instancedMesh>
    <instancedMesh ref={joints} args={[undefined, undefined, 60]}><cylinderGeometry args={[1, 1, 1, 6]}/><meshStandardMaterial color="#b1b47a" roughness={.9}/></instancedMesh>
    <instancedMesh ref={leaves} args={[undefined, undefined, 120]}><sphereGeometry args={[1, 6, 4]}/><meshStandardMaterial roughness={.95}/></instancedMesh>
  </group>;
}

export function DriftingPetals() {
  const petals = useRef<THREE.InstancedMesh>(null);
  const object = useMemo(() => new THREE.Object3D(), []);
  const lastUpdate = useRef(0);
  useFrame(({ clock }) => {
    if (!petals.current || clock.elapsedTime - lastUpdate.current < 1 / 24) return;
    lastUpdate.current = clock.elapsedTime;
    for (let i = 0; i < 48; i++) {
      const phase = (clock.elapsedTime * .07 + i * .618) % 1, side = i % 2 ? -1 : 1;
      object.position.set(side * 11.2 + Math.sin(i * 2.4) * 2 + Math.sin(clock.elapsedTime * .4 + i) * .5,
        6.5 * (1 - phase) + .1, (i % 4 < 2 ? 17 : 35) + Math.cos(i * 2.4) * 2 + phase);
      object.rotation.set(clock.elapsedTime * .35 + i, i + phase * 2, Math.sin(clock.elapsedTime + i) * .7);
      object.scale.setScalar(.7 + i % 3 * .15); object.updateMatrix(); petals.current.setMatrixAt(i, object.matrix);
    }
    petals.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={petals} args={[undefined, undefined, 48]} frustumCulled={false}>
    <circleGeometry args={[.055, 8]}/><meshStandardMaterial color="#f3c9cf" side={THREE.DoubleSide} roughness={1}/>
  </instancedMesh>;
}

export function PathMedallions() {
  const petals = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!petals.current) return;
    const object = new THREE.Object3D();
    for (let j = 0; j < 3; j++) for (let i = 0; i < 12; i++) {
      const angle = i / 12 * Math.PI * 2;
      object.position.set(Math.sin(angle) * .43, .02, 19 + j * 6 + Math.cos(angle) * .43);
      object.rotation.set(0, angle, 0); object.scale.set(.11, .008, .34); object.updateMatrix(); petals.current.setMatrixAt(j * 12 + i, object.matrix);
    }
    petals.current.instanceMatrix.needsUpdate = true; petals.current.computeBoundingSphere();
  }, []);
  return <group>
    {[19, 25, 31].map(z => <group key={z} position={[0, .018, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh><ringGeometry args={[.96, .985, 48]}/><meshStandardMaterial color="#9a997a" roughness={1}/></mesh>
      <mesh><ringGeometry args={[.86, .875, 48]}/><meshStandardMaterial color="#b2ad89" roughness={1}/></mesh>
      <mesh><circleGeometry args={[.16, 24]}/><meshStandardMaterial color="#b1a475" roughness={1}/></mesh>
    </group>)}
    <instancedMesh ref={petals} args={[undefined, undefined, 36]}><sphereGeometry args={[1, 8, 6]}/><meshStandardMaterial color="#aca482" roughness={1}/></instancedMesh>
  </group>;
}
