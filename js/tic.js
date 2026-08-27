// tic.js — Big outdoor Tic-Tac-Toe billboard.
// Shoot an arrow into an empty cell to place your mark (X).
// The board plays O with strong-but-beatable AI.
// Win / lose / draw message appears on the screen, then auto-resets.

export function createTic({
  scene,
  terrainHeight,
  archery,
  position = { x: 95, z: 95 },
  onEvent = () => {}
}) {
  const px = position.x;
  const pz = position.z;
  const y0 = terrainHeight(px, pz);

  const root = new THREE.Group();
  root.position.set(px, y0, pz);
  root.visible = false;
  scene.add(root);

  // ---------- materials ----------
  const frameMat   = new THREE.MeshStandardMaterial({ color: 0x3a2e24, roughness: 0.9, flatShading: true });
  const boardMat   = new THREE.MeshStandardMaterial({ color: 0x1a222c, roughness: 0.85, flatShading: true });
  const cellMat    = new THREE.MeshStandardMaterial({ color: 0x2a3544, roughness: 0.8, flatShading: true });
  const lineMat    = new THREE.MeshStandardMaterial({ color: 0x6a7a8a, roughness: 0.7, flatShading: true });
  const xMat       = new THREE.MeshStandardMaterial({ color: 0xff6b4a, emissive: 0x441800, emissiveIntensity: 0.35, roughness: 0.6, flatShading: true });
  const oMat       = new THREE.MeshStandardMaterial({ color: 0x4ac8ff, emissive: 0x003344, emissiveIntensity: 0.35, roughness: 0.6, flatShading: true });
  const postMat    = new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 0.95, flatShading: true });
  const glowMat    = new THREE.MeshBasicMaterial({ color: 0xffd070, transparent: true, opacity: 0.55 });

  // ---------- billboard structure ----------
  // posts
  [-4.6, 4.6].forEach(x => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 9.2, 6), postMat);
    post.position.set(x, 4.6, 0.15);
    root.add(post);
  });
  // cross beam
  const beam = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.35, 0.35), postMat);
  beam.position.set(0, 9.1, 0.15);
  root.add(beam);

  // main board face (slightly recessed)
  const board = new THREE.Mesh(new THREE.BoxGeometry(8.4, 8.4, 0.28), boardMat);
  board.position.set(0, 4.9, 0);
  root.add(board);

  // outer frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(8.9, 8.9, 0.18), frameMat);
  frame.position.set(0, 4.9, -0.12);
  root.add(frame);

  // header bar
  const header = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.9, 0.2), frameMat);
  header.position.set(0, 9.5, 0.05);
  root.add(header);

  // status canvas (YOU WIN / YOU LOSE / DRAW / YOUR TURN)
  const statusCanvas = document.createElement('canvas');
  statusCanvas.width = 512;
  statusCanvas.height = 64;
  const statusCtx = statusCanvas.getContext('2d');
  const statusTex = new THREE.CanvasTexture(statusCanvas);
  statusTex.anisotropy = 2;
  const statusMat = new THREE.MeshBasicMaterial({ map: statusTex, transparent: true, side: THREE.DoubleSide });
  const statusPlane = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 0.7), statusMat);
  statusPlane.position.set(0, 9.5, 0.18);
  root.add(statusPlane);

  function setStatus(text, color = '#ffe6ab') {
    statusCtx.clearRect(0, 0, 512, 64);
    statusCtx.fillStyle = 'rgba(20,14,10,0.75)';
    statusCtx.fillRect(0, 0, 512, 64);
    statusCtx.strokeStyle = color;
    statusCtx.lineWidth = 3;
    statusCtx.strokeRect(4, 4, 504, 56);
    statusCtx.font = '700 36px "Segoe UI", system-ui, sans-serif';
    statusCtx.textAlign = 'center';
    statusCtx.textBaseline = 'middle';
    statusCtx.fillStyle = color;
    statusCtx.fillText(text, 256, 34);
    statusTex.needsUpdate = true;
  }
  setStatus('SHOOT A CELL · YOU ARE X', '#a8c8ff');

  // ---------- 3×3 cells ----------
  const CELL = 2.35;
  const GAP  = 0.18;
  const ORIGIN = -CELL - GAP; // left/top of centre cell

  const cells = []; // { mesh, mark: null|'x'|'o', group, targetId }
  const marks = []; // visual X/O groups for cleanup

  function cellWorldPos(i, j) {
    const lx = ORIGIN + i * (CELL + GAP);
    const ly = 4.9 + ORIGIN + j * (CELL + GAP);
    return new THREE.Vector3(px + lx, y0 + ly, pz);
  }

  for (let j = 0; j < 3; j++) {
    for (let i = 0; i < 3; i++) {
      const idx = j * 3 + i;
      const g = new THREE.Group();
      const lx = ORIGIN + i * (CELL + GAP);
      const ly = ORIGIN + j * (CELL + GAP);
      g.position.set(lx, 4.9 + ly, 0.16);

      const face = new THREE.Mesh(
        new THREE.BoxGeometry(CELL - 0.12, CELL - 0.12, 0.08),
        cellMat.clone()
      );
      g.add(face);

      // subtle inner bevel
      const rim = new THREE.Mesh(
        new THREE.BoxGeometry(CELL, CELL, 0.04),
        lineMat
      );
      rim.position.z = -0.04;
      g.add(rim);

      root.add(g);
      cells.push({ mesh: face, mark: null, group: g, i, j, idx });
    }
  }

  // grid lines (visual only)
  for (let k = 1; k < 3; k++) {
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.1, 7.3, 0.06), lineMat);
    v.position.set(ORIGIN + k * (CELL + GAP) - (CELL + GAP) / 2, 4.9, 0.2);
    root.add(v);
    const h = new THREE.Mesh(new THREE.BoxGeometry(7.3, 0.1, 0.06), lineMat);
    h.position.set(0, 4.9 + ORIGIN + k * (CELL + GAP) - (CELL + GAP) / 2, 0.2);
    root.add(h);
  }

  // soft glow under the board at night
  const underGlow = new THREE.PointLight(0x4ac8ff, 0.6, 18, 2);
  underGlow.position.set(0, 2.2, 1.5);
  root.add(underGlow);

  // ---------- mark builders ----------
  function makeX() {
    const g = new THREE.Group();
    const a = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.22, 0.18), xMat);
    a.rotation.z = Math.PI / 4;
    const b = a.clone();
    b.rotation.z = -Math.PI / 4;
    g.add(a, b);
    return g;
  }
  function makeO() {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.13, 8, 20), oMat);
    g.add(ring);
    return g;
  }

  function placeMark(idx, who) {
    const cell = cells[idx];
    if (cell.mark) return false;
    cell.mark = who;
    const mark = who === 'x' ? makeX() : makeO();
    mark.position.z = 0.12;
    cell.group.add(mark);
    marks.push(mark);
    // flash the cell
    cell.mesh.material.emissive = new THREE.Color(who === 'x' ? 0xff3300 : 0x0088ff);
    cell.mesh.material.emissiveIntensity = 0.55;
    setTimeout(() => {
      cell.mesh.material.emissiveIntensity = 0;
    }, 280);
    return true;
  }

  // ---------- game state ----------
  let boardState = Array(9).fill(null); // 'x' | 'o' | null
  let turn = 'x';          // player always X, goes first
  let gameOver = false;
  let winner = null;     // 'x' | 'o' | 'draw'
  let aiThinking = false;
  let resetTimer = 0;
  let isVisible = false;
  const RENDER_DIST = 140;

  const WIN_LINES = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];

  function checkWinner(state) {
    for (const [a,b,c] of WIN_LINES) {
      if (state[a] && state[a] === state[b] && state[a] === state[c]) return state[a];
    }
    if (state.every(c => c)) return 'draw';
    return null;
  }

  // ---------- minimax AI (perfect) with deliberate mistakes ----------
  function minimax(state, isMax, depth) {
    const w = checkWinner(state);
    if (w === 'o') return 10 - depth;
    if (w === 'x') return depth - 10;
    if (w === 'draw') return 0;

    let best = isMax ? -Infinity : Infinity;
    for (let i = 0; i < 9; i++) {
      if (state[i]) continue;
      state[i] = isMax ? 'o' : 'x';
      const score = minimax(state, !isMax, depth + 1);
      state[i] = null;
      best = isMax ? Math.max(best, score) : Math.min(best, score);
    }
    return best;
  }

  function bestMove() {
    // 22 % chance of a random legal move → beatable but still strong
    const empty = [];
    for (let i = 0; i < 9; i++) if (!boardState[i]) empty.push(i);
    if (empty.length === 0) return -1;

    if (Math.random() < 0.22) {
      return empty[Math.floor(Math.random() * empty.length)];
    }

    let bestScore = -Infinity;
    let move = empty[0];
    for (const i of empty) {
      boardState[i] = 'o';
      const score = minimax(boardState, false, 0);
      boardState[i] = null;
      if (score > bestScore) {
        bestScore = score;
        move = i;
      }
    }
    return move;
  }

  function endGame(result) {
    gameOver = true;
    winner = result;
    if (result === 'x') {
      setStatus('★  YOU WIN  ★', '#7dffb0');
      onEvent('ticWin', {});
    } else if (result === 'o') {
      setStatus('YOU LOSE', '#ff6b6b');
      onEvent('ticLose', {});
    } else {
      setStatus('DRAW', '#ffd070');
      onEvent('ticDraw', {});
    }
    // highlight winning line
    if (result === 'x' || result === 'o') {
      for (const line of WIN_LINES) {
        if (boardState[line[0]] === result &&
            boardState[line[1]] === result &&
            boardState[line[2]] === result) {
          line.forEach(idx => {
            cells[idx].mesh.material.emissive = new THREE.Color(result === 'x' ? 0x22ff88 : 0xff3344);
            cells[idx].mesh.material.emissiveIntensity = 0.7;
          });
          break;
        }
      }
    }
    resetTimer = 5.5; // seconds until auto-reset
  }

  function resetBoard() {
    boardState = Array(9).fill(null);
    turn = 'x';
    gameOver = false;
    winner = null;
    aiThinking = false;
    marks.forEach(m => { if (m.parent) m.parent.remove(m); });
    marks.length = 0;
    cells.forEach(c => {
      c.mark = null;
      c.mesh.material.emissiveIntensity = 0;
    });
    setStatus('SHOOT A CELL · YOU ARE X', '#a8c8ff');
  }

  // ---------- archery targets (one per cell) ----------
  cells.forEach((cell, idx) => {
    const worldPos = new THREE.Vector3();
    archery.register({
      name: `ticCell${idx}`,
      radius: 1.15,
      getPos: () => {
        worldPos.set(
          px + cell.group.position.x,
          y0 + cell.group.position.y,
          pz + 0.25
        );
        return worldPos;
      },
      onHit: () => {
        if (!isVisible || gameOver || aiThinking || turn !== 'x') return;
        if (boardState[idx]) return;

        boardState[idx] = 'x';
        placeMark(idx, 'x');
        onEvent('ticMove', { player: 'x', cell: idx });

        const result = checkWinner(boardState);
        if (result) {
          endGame(result);
          return;
        }

        // AI turn
        turn = 'o';
        aiThinking = true;
        setStatus('BOARD IS THINKING…', '#8ab4ff');
        // small delay so it feels reactive
        setTimeout(() => {
          if (gameOver) return;
          const move = bestMove();
          if (move >= 0) {
            boardState[move] = 'o';
            placeMark(move, 'o');
            onEvent('ticMove', { player: 'o', cell: move });
          }
          const r2 = checkWinner(boardState);
          if (r2) endGame(r2);
          else {
            turn = 'x';
            setStatus('YOUR TURN · SHOOT A CELL', '#a8c8ff');
          }
          aiThinking = false;
        }, 420 + Math.random() * 380);
      }
    });
  });

  // ---------- POI ----------
  const poiList = [{
    name: 'Tic-Tac Arena',
    pos: { x: px, z: pz },
    r: 18,
    flavor: 'A towering board dares you to a game of marks. Shoot the empty squares — the board answers.'
  }];

  // ---------- update ----------
  function update(dt, elapsed, playerPos = null) {
    if (playerPos) {
      const dist = Math.hypot(playerPos.x - px, playerPos.z - pz);
      const should = dist < RENDER_DIST;
      if (should !== isVisible) {
        isVisible = should;
        root.visible = isVisible;
      }
    }
    if (!isVisible) return;

    // soft idle pulse on empty cells
    if (!gameOver && turn === 'x') {
      const pulse = 0.08 + 0.06 * Math.sin(elapsed * 2.4);
      cells.forEach(c => {
        if (!c.mark) c.mesh.material.emissiveIntensity = pulse;
      });
    }

    // under-glow flicker
    underGlow.intensity = 0.45 + 0.15 * Math.sin(elapsed * 1.7);

    // auto-reset countdown
    if (gameOver && resetTimer > 0) {
      resetTimer -= dt;
      if (resetTimer <= 0) resetBoard();
    }
  }

  return {
    update,
    poiList,
    position: { x: px, z: pz },
    group: root,
    reset: resetBoard
  };
}