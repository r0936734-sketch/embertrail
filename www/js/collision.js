// collision.js — lightweight static collision so the player stops passing
// through trees, rocks, structures and walls. Circle colliders push the
// player out radially; box colliders (axis-aligned — used for the cabin's
// rectangular interior) push out along the shallower overlap axis.
export function createCollisionSystem() {
  const colliders = [];
  const cells = new Map();
  const nearby = new Set();
  const CELL_SIZE = 18;

  function indexCollider(c) {
    const reach = c.type === 'circle' ? c.r : Math.max(c.hw, c.hd);
    c._cells = [];
    const minX = Math.floor((c.x - reach) / CELL_SIZE);
    const maxX = Math.floor((c.x + reach) / CELL_SIZE);
    const minZ = Math.floor((c.z - reach) / CELL_SIZE);
    const maxZ = Math.floor((c.z + reach) / CELL_SIZE);
    for (let x = minX; x <= maxX; x++) for (let z = minZ; z <= maxZ; z++) {
      const key = `${x},${z}`;
      let bucket = cells.get(key);
      if (!bucket) cells.set(key, bucket = []);
      bucket.push(c);
      c._cells.push(key);
    }
  }

  function unindexCollider(c) {
    if (!c._cells) return;
    for (const key of c._cells) {
      const bucket = cells.get(key);
      if (!bucket) continue;
      const index = bucket.indexOf(c);
      if (index !== -1) bucket.splice(index, 1);
      if (bucket.length === 0) cells.delete(key);
    }
  }

  function addCollider(x, z, r) {
    const collider = { type: 'circle', x, z, r, enabled: true };
    colliders.push(collider);
    indexCollider(collider);
    return collider;
  }

  function addBox(x, z, halfW, halfD) {
    const collider = { type: 'box', x, z, hw: halfW, hd: halfD, enabled: true };
    colliders.push(collider);
    indexCollider(collider);
    return collider;
  }

  function moveCollider(collider, x, z) {
    if (!collider || (collider.x === x && collider.z === z)) return;
    unindexCollider(collider);
    collider.x = x;
    collider.z = z;
    indexCollider(collider);
  }

  function resolve(pos, radius) {
    nearby.clear();
    const minX = Math.floor((pos.x - radius) / CELL_SIZE);
    const maxX = Math.floor((pos.x + radius) / CELL_SIZE);
    const minZ = Math.floor((pos.z - radius) / CELL_SIZE);
    const maxZ = Math.floor((pos.z + radius) / CELL_SIZE);
    for (let x = minX; x <= maxX; x++) for (let z = minZ; z <= maxZ; z++) {
      const bucket = cells.get(`${x},${z}`);
      if (bucket) for (const c of bucket) nearby.add(c);
    }
    for (const c of nearby) {
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

  return { addCollider, addBox, moveCollider, resolve, colliders };
}
