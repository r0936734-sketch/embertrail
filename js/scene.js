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
    bottomColor: { value: new THREE.Color(0x5b7086) }
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
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
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
  const n = 500;
  const starGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.85);
    const r = 480;
    pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.cos(phi) + 30;
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const starsMat = new THREE.PointsMaterial({
    color: 0xffffff, size: 1.15, transparent: true, opacity: 0,
    fog: false, sizeAttenuation: false
  });
  scene.add(new THREE.Points(starGeo, starsMat));

  return {
    scene, camera, renderer, skyUniforms,
    ambientLight, hemiLight, sunLight, moonLight,
    sunMesh, moon, moonGlow, starsMat
  };
}