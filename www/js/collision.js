// collision.js — lightweight static collision so the player stops passing
// through trees, rocks, structures and walls. Circle colliders push the
// player out radially; box colliders (axis-aligned — used for the cabin's
// rectangular interior) push out along the shallower overlap axis.
export function createCollisionSystem() {
  const colliders = [];

  function addCollider(x, z, r) {
    const collider = { type: 'circle', x, z, r, enabled: true };
    colliders.push(collider);
    return collider;
  }

  function addBox(x, z, halfW, halfD) {
    const collider = { type: 'box', x, z, hw: halfW, hd: halfD, enabled: true };
    colliders.push(collider);
    return collider;
  }

  function resolve(pos, radius) {
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (!c.enabled) continue;
      if (c.type === 'circle') {
        const dx = pos.x - c.x, dz = pos.z - c.z;
        const minD = c.r + radius;
        const distSq = dx * dx + dz * dz;
        if (distSq < minD * minD) {
          // An exact centre hit has no radial direction; choose one so the
          // player cannot remain embedded in a circular collider.
          if (distSq < 0.000001) {
            pos.x += minD;
            continue;
          }
          const dist = Math.sqrt(distSq);
          const push = minD - dist;
          pos.x += (dx / dist) * push;
          pos.z += (dz / dist) * push;
        }
      } else {
        const dx = pos.x - c.x, dz = pos.z - c.z;
        const overlapX = c.hw + radius - Math.abs(dx);
        const overlapZ = c.hd + radius - Math.abs(dz);
        if (overlapX > 0 && overlapZ > 0) {
          if (overlapX < overlapZ) pos.x += (dx < 0 ? -1 : 1) * overlapX;
          else pos.z += (dz < 0 ? -1 : 1) * overlapZ;
        }
      }
    }
    return pos;
  }

  return { addCollider, addBox, resolve, colliders };
}
