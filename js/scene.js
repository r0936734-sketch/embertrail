export function createScene() {
  const wrap = document.getElementById('canvas-wrap');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x5b7086, 1);
  wrap.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x5b7086, 55, 280);

  const baseFov = 55;
  const camera = new THREE.PerspectiveCamera(
    baseFov,
    window.innerWidth / window.innerHeight,
    0.1,
    1400
  );
  camera.position.set(0, 60, 140);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // lights
  const ambientLight = new THREE.AmbientLight(0x33456b, 0.95);
  scene.add(ambientLight);
  const hemiLight = new THREE.HemisphereLight(0xaec6e0, 0x3a3226, 0.55);
  scene.add(hemiLight);
  const sunLight = new THREE.DirectionalLight(0xffe3b0, 0.2);
  scene.add(sunLight);
  const moonLight = new THREE.DirectionalLight(0xaebedd, 0.35);
  moonLight.position.set(-60, 90, -40);
  scene.add(moonLight);

  // sky
  const skyUniforms = {
    topColor: { value: new THREE.Color(0x0a1226) },
    bottomColor: { value: new THREE.Color(0x5b7086) },
    nightAmt: { value: 0 }
  };

  const skyGeo = new THREE.SphereGeometry(550, 28, 18);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: Object.assign(skyUniforms, { offset: { value: 15 }, exponent: { value: 0.7 } }),
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPosition = wp.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      uniform float nightAmt;
      varying vec3 vWorldPosition;
      float hash(vec3 p) {
        return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
      }
      void main() {
        float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
        vec3 sky = mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0));
        vec3 dir = normalize(vWorldPosition);
        float band = sin(dir.x * 2.2 + dir.y * 1.3) * 0.5 + 0.5;
        band *= smoothstep(0.0, 0.6, h + 0.3);
        float n = hash(floor(dir * 40.0));
        vec3 nebulaCol = mix(vec3(0.25, 0.08, 0.35), vec3(0.05, 0.25, 0.35), band);
        sky += nebulaCol * band * 0.35 * nightAmt * step(0.85, n + band * 0.3);
        gl_FragColor = vec4(sky, 1.0);
      }`,
    side: THREE.BackSide,
    fog: false
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  // sun / moon
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(9, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xf3ecd9, fog: false })
  );
  scene.add(moon);

  const moonGlow = new THREE.Mesh(
    new THREE.SphereGeometry(14, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xf3ecd9, transparent: true, opacity: 0.18, fog: false })
  );
  scene.add(moonGlow);

  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(11, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffdca0, fog: false, transparent: true })
  );
  scene.add(sunMesh);

  // stars
  const n = 2600;
  const starGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  const starColors = new Float32Array(n * 3);
  const starColor = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.85);
    const r = 480;
    pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.cos(phi) + 30;
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    const tint = Math.random();
    starColor.setHSL(
      tint < 0.7 ? 0.6 : tint < 0.88 ? 0.62 : 0.78,
      tint < 0.7 ? 0.05 : 0.5,
      tint < 0.7 ? 0.9 : 0.75
    );
    starColors[i * 3] = starColor.r;
    starColors[i * 3 + 1] = starColor.g;
    starColors[i * 3 + 2] = starColor.b;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  const starsMat = new THREE.PointsMaterial({
    vertexColors: true, size: 1.15, transparent: true, opacity: 0,
    fog: false, sizeAttenuation: false
  });
  scene.add(new THREE.Points(starGeo, starsMat));

  const planetsGroup = new THREE.Group();
  [
    { color: 0xd88c5a, size: 5, dist: 430 },
    { color: 0x6fa8dc, size: 3.2, dist: 460 },
    { color: 0xb388d9, size: 2.4, dist: 410 }
  ].forEach(planet => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(planet.size, 16, 16),
      new THREE.MeshBasicMaterial({ color: planet.color, fog: false, transparent: true, opacity: 0 })
    );
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.7);
    mesh.position.set(
      Math.sin(phi) * Math.cos(theta) * planet.dist,
      Math.cos(phi) * planet.dist * 0.5 + 60,
      Math.sin(phi) * Math.sin(theta) * planet.dist
    );
    planetsGroup.add(mesh);
  });
  scene.add(planetsGroup);

  return {
    scene, camera, renderer, skyUniforms,
    ambientLight, hemiLight, sunLight, moonLight,
    sunMesh, moon, moonGlow, starsMat, planetsGroup
  };
}
