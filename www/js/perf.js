// Shared performance helpers. Cheap lighting + distance skip keep the bigger
// valley playable on phones without changing gameplay APIs.

export function patchCheapMaterials() {
  if (!THREE || THREE.__emberCheapMats) return;
  THREE.__emberCheapMats = true;
  const Lambert = THREE.MeshLambertMaterial;
  THREE.MeshStandardMaterial = function MeshStandardMaterial(params = {}) {
    return new Lambert({
      color: params.color,
      map: params.map,
      vertexColors: params.vertexColors,
      transparent: params.transparent,
      opacity: params.opacity,
      side: params.side,
      fog: params.fog,
      flatShading: params.flatShading,
      emissive: params.emissive,
      emissiveIntensity: params.emissiveIntensity,
      visible: params.visible
    });
  };
}

export function isMobileDevice() {
  return (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
    (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
}

export const WORLD_RADIUS = 430;

export function distSq(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

export function clampToWorld(x, z, radius = WORLD_RADIUS) {
  const d = Math.hypot(x, z);
  if (d <= radius || d < 0.001) return { x, z };
  const s = radius / d;
  return { x: x * s, z: z * s };
}

export function setFarCulled(object, visible) {
  if (object.visible !== visible) object.visible = visible;
}
