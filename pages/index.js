import { useEffect, useRef, useState } from "react";

export default function Home() {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const clockRef = useRef(null);
  const animReqRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(20);

  useEffect(() => {
    let cleanup = () => {};
    let stopped = false;

    (async () => {
      const THREE = await import("three");

      const container = containerRef.current;
      const width = container.clientWidth;
      const height = Math.floor((container.clientWidth * 9) / 16);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x07090b);

      const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 200);
      camera.position.set(10, 6, 12);

      const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      container.innerHTML = "";
      container.appendChild(renderer.domElement);

      // Lights
      const hemi = new THREE.HemisphereLight(0x88ccff, 0x222211, 0.6);
      scene.add(hemi);
      const dir = new THREE.DirectionalLight(0xffffff, 1.0);
      dir.position.set(5, 10, 4);
      scene.add(dir);

      // Ground
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(200, 200),
        new THREE.MeshStandardMaterial({ color: 0x0f1216, metalness: 0.1, roughness: 0.9 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

      // Subtle grid
      const grid = new THREE.GridHelper(100, 100, 0x203040, 0x101820);
      grid.material.opacity = 0.25;
      grid.material.transparent = true;
      scene.add(grid);

      // Fog
      scene.fog = new THREE.FogExp2(0x07090b, 0.03);

      // Utility creators
      function createArmorSet(variant = 0, tint = 0xff4444) {
        const group = new THREE.Group();
        const metal = new THREE.MeshStandardMaterial({ color: tint, metalness: 0.9, roughness: 0.2 });
        const dark = new THREE.MeshStandardMaterial({ color: 0x222831, metalness: 0.4, roughness: 0.6 });

        // Torso
        const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.2, 6, 12), dark);
        torso.position.y = 1.5;
        group.add(torso);

        // Head + helm crest
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), dark);
        head.position.y = 2.5;
        group.add(head);

        const helm = new THREE.Mesh(new THREE.ConeGeometry(0.25 + 0.05 * variant, 0.6 + 0.1 * variant, 8 + 2 * variant), metal);
        helm.position.set(0, 3.1, 0);
        group.add(helm);

        // Pauldrons
        const shoulderL = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.12, 10, 16), metal);
        shoulderL.rotation.x = Math.PI / 2;
        shoulderL.position.set(-0.6, 2.1, 0);
        group.add(shoulderL);
        const shoulderR = shoulderL.clone();
        shoulderR.position.x = 0.6;
        group.add(shoulderR);

        // Bracers
        const bracerL = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 0.7, 10), metal);
        bracerL.rotation.z = 0.25;
        bracerL.position.set(-0.7, 1.4, 0.15);
        group.add(bracerL);
        const bracerR = bracerL.clone();
        bracerR.position.set(0.7, 1.4, 0.15);
        group.add(bracerR);

        // Greaves
        const greaveL = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.9, 10), metal);
        greaveL.position.set(-0.25, 0.5, 0.05);
        group.add(greaveL);
        const greaveR = greaveL.clone();
        greaveR.position.x = 0.25;
        group.add(greaveR);

        // Spinal fins/unique silhouette (distinct from any franchise)
        const finMat = new THREE.MeshStandardMaterial({ color: 0x99e2ff, emissive: 0x0a1a22, metalness: 0.2, roughness: 0.3 });
        for (let i = 0; i < 4 + variant; i++) {
          const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3 + i * 0.08, 0.4), finMat);
          fin.position.set(0, 1.1 + i * 0.25, -0.25 - i * 0.02);
          fin.rotation.x = -0.2;
          group.add(fin);
        }

        // Arms (simple rods)
        const armMat = new THREE.MeshStandardMaterial({ color: 0x2b3440, metalness: 0.3, roughness: 0.7 });
        const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 12), armMat);
        armL.rotation.z = Math.PI / 2;
        armL.position.set(-0.9, 1.6, 0);
        group.add(armL);
        const armR = armL.clone();
        armR.position.x = 0.9;
        group.add(armR);

        // Sword
        const sword = new THREE.Group();
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 0.2), new THREE.MeshStandardMaterial({ color: 0xdde6f7, metalness: 1.0, roughness: 0.1 }));
        blade.position.y = 1.0;
        const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 10), new THREE.MeshStandardMaterial({ color: 0x5b6575, metalness: 0.6, roughness: 0.4 }));
        hilt.position.y = -0.2;
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.2), new THREE.MeshStandardMaterial({ color: 0x99a1b2, metalness: 0.8, roughness: 0.3 }));
        guard.position.y = 0.0;
        sword.add(blade);
        sword.add(hilt);
        sword.add(guard);
        sword.position.set(0.9, 1.6, 0);
        sword.rotation.z = -Math.PI / 4;
        group.add(sword);
        group.userData.sword = sword;
        return group;
      }

      function createFighter({ tint = 0xff4444, variant = 0 }) {
        const g = createArmorSet(variant, tint);
        g.userData.variant = variant;
        g.userData.tint = tint;
        return g;
      }

      // Fighters
      const hero = createFighter({ tint: 0x9fff9f, variant: 2 });
      hero.position.set(-8, 0, 0);
      scene.add(hero);

      const enemy1 = createFighter({ tint: 0xff6b6b, variant: 1 });
      const enemy2 = createFighter({ tint: 0xffb86b, variant: 2 });
      const enemy3 = createFighter({ tint: 0x6bb8ff, variant: 0 });
      enemy1.position.set(8, 0, -2.0);
      enemy2.position.set(8.5, 0, 0);
      enemy3.position.set(7.5, 0, 2.0);
      scene.add(enemy1, enemy2, enemy3);

      // Ambient effects: light shafts
      const shaftMat = new THREE.MeshStandardMaterial({ color: 0x99ccff, emissive: 0x112233, transparent: true, opacity: 0.05, metalness: 0.0, roughness: 1.0 });
      for (let i = 0; i < 8; i++) {
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05 + Math.random() * 0.2, 0.05, 40, 8), shaftMat);
        shaft.position.set(-15 + i * 4, 20, -10 + Math.random() * 20);
        scene.add(shaft);
      }

      // Camera target
      const camTarget = new THREE.Vector3(0, 1.5, 0);

      // Animation timeline
      const clock = new THREE.Clock();

      function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
      function smoothstep(edge0, edge1, x) {
        const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
        return t * t * (3 - 2 * t);
      }

      function approach(obj, targetX, speed, dt) {
        const dx = targetX - obj.position.x;
        const step = Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
        obj.position.x += step;
      }

      function swingSword(fighter, tNorm, strength = 1) {
        const s = fighter.userData.sword;
        if (!s) return;
        const swing = Math.sin(tNorm * Math.PI * 2) * 0.9 * strength;
        s.rotation.z = -Math.PI / 3 + swing;
        s.rotation.y = Math.cos(tNorm * Math.PI * 2) * 0.2;
      }

      function knockback(fighter, dirSign, power, decay) {
        fighter.position.x += dirSign * power;
        fighter.position.y = Math.max(0, fighter.position.y - 0.03 * power);
        // simple damping back to ground
        fighter.position.y *= decay;
      }

      function fallDown(fighter, t) {
        const r = clamp((t - 0.0) / 1.0, 0, 1);
        fighter.rotation.z = -r * (Math.PI / 2) * (Math.random() > 0.5 ? 1 : -1);
        fighter.position.y = Math.max(0, 0.2 * (1 - r));
      }

      function animate() {
        const t = clock.getElapsedTime();
        const dt = clock.getDelta();
        const total = 20.0; // seconds per showcase loop
        const localT = t % total;

        // Camera gentle orbit
        const camR = 14;
        camera.position.x = Math.cos(localT * 0.25) * camR;
        camera.position.z = Math.sin(localT * 0.25) * camR;
        camera.position.y = 6 + Math.sin(localT * 0.5) * 0.2;
        camTarget.set(0, 1.6, 0);
        camera.lookAt(camTarget);

        // Phases
        // 0-4s: approach
        // 4-14s: exchanges
        // 14-20s: finishers / falls

        if (localT < 4.0) {
          approach(hero, -1.5, 3.5, dt);
          approach(enemy1, 1.2, 2.8, dt);
          approach(enemy2, 0.6, 2.6, dt);
          approach(enemy3, 2.0, 2.9, dt);
          swingSword(hero, localT / 4, 0.6);
        } else if (localT < 14.0) {
          const phase = Math.floor((localT - 4.0) / 3.333);
          const pT = ((localT - 4.0) % 3.333) / 3.333; // 0..1
          // Target selection
          const targets = [enemy1, enemy2, enemy3];
          const target = targets[phase % targets.length];

          // Hero circles and swings
          hero.position.z = Math.sin(localT * 0.8) * 0.8;
          swingSword(hero, pT, 1.0);

          // Simple hit window
          if (pT > 0.45 && pT < 0.6) {
            const dir = Math.sign(target.position.x - hero.position.x) || 1;
            knockback(target, dir, 0.2, 0.92);
          } else {
            // recover to stance
            target.position.y *= 0.9;
            target.rotation.z *= 0.9;
          }
        } else {
          const ft = (localT - 14.0) / 6.0; // 0..1
          swingSword(hero, ft * 2.0, 1.2);
          fallDown(enemy1, ft * 1.2);
          fallDown(enemy2, clamp(ft * 1.4 - 0.2, 0, 1));
          fallDown(enemy3, clamp(ft * 1.6 - 0.4, 0, 1));
          enemy1.position.x += Math.sin(ft * 5) * 0.01;
          enemy2.position.x -= Math.sin(ft * 6) * 0.008;
          enemy3.position.x += Math.sin(ft * 7) * 0.006;
        }

        renderer.render(scene, camera);
        animReqRef.current = requestAnimationFrame(animate);
      }

      // Resize handling
      function onResize() {
        const w = container.clientWidth;
        const h = Math.floor((w * 9) / 16);
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      window.addEventListener("resize", onResize);

      // Store refs
      rendererRef.current = renderer;
      sceneRef.current = scene;
      cameraRef.current = camera;
      clockRef.current = clock;

      animate();

      cleanup = () => {
        if (stopped) return;
        stopped = true;
        cancelAnimationFrame(animReqRef.current);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
        scene.traverse(obj => {
          if (obj.isMesh) {
            obj.geometry?.dispose?.();
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose?.());
            else obj.material?.dispose?.();
          }
        });
      };
    })();

    return () => cleanup();
  }, []);

  async function startRecording() {
    if (isRecording) return;
    const canvas = rendererRef.current?.domElement;
    if (!canvas) return;
    const stream = canvas.captureStream(60);
    streamRef.current = stream;
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
    const mr = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
    mediaRecorderRef.current = mr;
    chunksRef.current = [];

    mr.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fight-scene-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setIsRecording(false);
    };

    setIsRecording(true);
    mr.start();

    const secs = Math.max(3, Math.min(60, recordSeconds));
    setTimeout(() => {
      if (mr.state !== "inactive") mr.stop();
      stream.getTracks().forEach(t => t.stop());
    }, secs * 1000);
  }

  return (
    <div className="container">
      <div className="controls">
        <span className="badge">Agentic Scene</span>
        <span className="small">1 vs 3 sword skirmish with unique armor</span>
      </div>
      <div className="sceneWrap" ref={containerRef} />
      <div className="controls">
        <button onClick={startRecording} disabled={isRecording}>{isRecording ? "Recording?" : "Record Video (WebM)"}</button>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="small">Duration (s)</span>
          <input
            type="number"
            min={3}
            max={60}
            value={recordSeconds}
            onChange={e => setRecordSeconds(parseInt(e.target.value || "20", 10))}
            style={{ width: 80, background: "#0b1220", color: "#e5e7eb", border: "1px solid #1f2937", borderRadius: 8, padding: 8 }}
          />
        </label>
      </div>
      <div className="overlay">Tip: Resize window before recording to set resolution</div>
    </div>
  );
}
