import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';

/**
 * PathScene — the signature visual of SkillPilot.
 * Renders the learner's roadmap as a glowing 3D trail winding through space.
 * Each milestone is a lit node: completed = gold/growth, current = pulsing,
 * upcoming = dim.
 *
 * Props:
 *   milestones: [{ id, title, status: 'done' | 'current' | 'upcoming' }]
 */
export default function PathScene({ milestones = [], ambient = false }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    // --- Scene setup ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0b0e14, ambient ? 0.06 : 0.035);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 2.2, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // --- Build the path curve ---
    const count = Math.max(milestones.length, 5);
    const points = [];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      points.push(
        new THREE.Vector3(
          Math.sin(t * Math.PI * 1.6) * 2.2,
          Math.sin(t * Math.PI * 3) * 0.6,
          -t * 14 + 4
        )
      );
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, 200, 0.045, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: 0xe8a33d,
      transparent: true,
      opacity: 0.55,
    });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    scene.add(tube);

    // Soft glow duplicate (cheap fake-bloom via additive blending)
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xe8a33d,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
    });
    const glowGeo = new THREE.TubeGeometry(curve, 200, 0.12, 8, false);
    scene.add(new THREE.Mesh(glowGeo, glowMat));

    // --- Milestone nodes ---
    const nodeGroup = new THREE.Group();
    const nodeMeshes = [];
    const statusColor = {
      done: 0x3ddc97,
      current: 0xe8a33d,
      upcoming: 0x5b6478,
    };

    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const pos = curve.getPointAt(t);
      const status = milestones[i]?.status || 'upcoming';
      const color = statusColor[status];

      const geo = new THREE.SphereGeometry(status === 'current' ? 0.14 : 0.1, 16, 16);
      const mat = new THREE.MeshBasicMaterial({ color });
      const node = new THREE.Mesh(geo, mat);
      node.position.copy(pos);
      nodeGroup.add(node);
      nodeMeshes.push({ mesh: node, status });
    }
    scene.add(nodeGroup);

    // Ambient particles for depth
    const starGeo = new THREE.BufferGeometry();
    const starCount = ambient ? 200 : 400;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
      starPos[i] = (Math.random() - 0.5) * 30;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0x5b6478, size: 0.02 });
    scene.add(new THREE.Points(starGeo, starMat));

    // --- Camera flight along the path (GSAP-driven) ---
    const camState = { t: 0 };
    const tween = gsap.to(camState, {
      t: 1,
      duration: ambient ? 40 : 18,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: !ambient,
      onUpdate: () => {
        const t = camState.t;
        const p = curve.getPointAt(Math.min(t, 0.98));
        const lookAt = curve.getPointAt(Math.min(t + 0.02, 1));
        camera.position.set(p.x * 0.4, p.y + 1.6, p.z + 6);
        camera.lookAt(lookAt.x, lookAt.y, lookAt.z - 2);
      },
    });

    // Pulse the "current" node
    nodeMeshes
      .filter((n) => n.status === 'current')
      .forEach((n) => {
        gsap.to(n.mesh.scale, {
          x: 1.6, y: 1.6, z: 1.6,
          duration: 0.9,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      });

    // --- Render loop ---
    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // --- Resize handling ---
    const handleResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(frameId);
      tween.kill();
      window.removeEventListener('resize', handleResize);
      mount.removeChild(renderer.domElement);
      tubeGeo.dispose();
      tubeMat.dispose();
      glowGeo.dispose();
      glowMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      nodeMeshes.forEach(({ mesh }) => {
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
      renderer.dispose();
    };
  }, [milestones, ambient]);

  return <div ref={mountRef} className="w-full h-full" />;
}
