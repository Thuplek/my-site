// 3D scene — floating glass chips with real tech logos
// React + Python as centerpieces

(function () {
  const canvas = document.getElementById("scene3d");
  if (!canvas || typeof THREE === "undefined") return;

  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 768;

  function initScene(mobile) {
    const SZ = mobile ? 256 : 512;
    const CURVE_SEG = mobile ? 6 : 18;
    const BEVEL_SEG = mobile ? 2 : 4;
    const ANISOTROPY = mobile ? 4 : 8;
    const FRAME_MS = mobile ? 1000 / 30 : 0;

    const CAM_Z = mobile ? 13 : 8;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, CAM_Z);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !mobile,
      alpha: true,
      powerPreference: mobile ? "low-power" : "high-performance",
    });
    renderer.setPixelRatio(mobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    function resize() {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", resize);
    resize();

    // ── Lighting ──────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, mobile ? 0.9 : 0.55));
    const key = new THREE.PointLight(0xff8a6b, mobile ? 8 : 14, 30); key.position.set(4, 4, 5); scene.add(key);
    const fill = new THREE.PointLight(0x5cc8ff, mobile ? 6 : 10, 30); fill.position.set(-5, -2, 4); scene.add(fill);
    if (!mobile) {
      const rim = new THREE.PointLight(0xffffff, 5, 25); rim.position.set(0, 3, -5); scene.add(rim);
    }

    // ── Procedural env for reflections (desktop only) ─────
    if (!mobile) {
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envScene = new THREE.Scene();
      const envMat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        vertexShader: `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
          varying vec3 vPos;
          void main() {
            vec3 n = normalize(vPos);
            vec3 top = vec3(0.08, 0.05, 0.13);
            vec3 mid = vec3(0.11, 0.05, 0.05);
            vec3 bot = vec3(0.02, 0.02, 0.04);
            float t = n.y * 0.5 + 0.5;
            vec3 col = mix(bot, mix(mid, top, smoothstep(0.4, 0.9, t)), t);
            float glow = pow(max(0.0, dot(n, normalize(vec3(0.7, 0.3, 0.5)))), 6.0);
            col += vec3(1.0, 0.36, 0.22) * glow * 0.7;
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      });
      envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 32), envMat));
      scene.environment = pmrem.fromScene(envScene, 0.04).texture;
    }

    // ── Rounded chip geometry ────────────────────────────
    function roundedShape(w, h, r) {
      const s = new THREE.Shape();
      s.moveTo(-w / 2 + r, -h / 2);
      s.lineTo(w / 2 - r, -h / 2);
      s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
      s.lineTo(w / 2, h / 2 - r);
      s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
      s.lineTo(-w / 2 + r, h / 2);
      s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
      s.lineTo(-w / 2, -h / 2 + r);
      s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
      return s;
    }
    function chipGeom(w, h) {
      const shape = roundedShape(w, h, Math.min(w, h) * 0.2);
      const geom = new THREE.ExtrudeGeometry(shape, {
        depth: 0.18, bevelEnabled: true,
        bevelSize: 0.05, bevelThickness: 0.05,
        bevelSegments: BEVEL_SEG,
        curveSegments: CURVE_SEG,
      });
      geom.center();
      geom.computeBoundingBox();
      const bb = geom.boundingBox;
      const sx = 1 / (bb.max.x - bb.min.x);
      const sy = 1 / (bb.max.y - bb.min.y);
      const uv = geom.attributes.uv;
      const pos = geom.attributes.position;
      for (let i = 0; i < uv.count; i++) {
        const x = pos.getX(i), y = pos.getY(i);
        uv.setXY(i, (x - bb.min.x) * sx, (y - bb.min.y) * sy);
      }
      uv.needsUpdate = true;
      return geom;
    }

    // ── Image loader (CORS-safe via jsDelivr) ────────────
    function loadImg(url) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(new Error("img load failed: " + url));
        img.src = url;
      });
    }

    // ── Tile texture: subtle brand tint + logo centered ──
    function makeTileTexture(logoImg, brandHex, label) {
      const c = document.createElement("canvas");
      c.width = SZ; c.height = SZ;
      const ctx = c.getContext("2d");

      ctx.fillStyle = "#f4f4f6";
      ctx.fillRect(0, 0, SZ, SZ);

      const tint = ctx.createRadialGradient(SZ * 0.3, SZ * 0.3, 40, SZ / 2, SZ / 2, SZ * 0.95);
      tint.addColorStop(0, hexAlpha(brandHex, 0.22));
      tint.addColorStop(0.6, hexAlpha(brandHex, 0.10));
      tint.addColorStop(1, hexAlpha(brandHex, 0.02));
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, SZ, SZ);

      const hl = ctx.createLinearGradient(0, 0, SZ, SZ);
      hl.addColorStop(0, "rgba(255,255,255,0.4)");
      hl.addColorStop(0.5, "rgba(255,255,255,0)");
      ctx.fillStyle = hl;
      ctx.fillRect(0, 0, SZ, SZ);

      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      const r = 60;
      ctx.moveTo(r + 10, 10);
      ctx.lineTo(SZ - r - 10, 10);
      ctx.quadraticCurveTo(SZ - 10, 10, SZ - 10, r + 10);
      ctx.stroke();

      if (logoImg) {
        const logoSize = SZ * 0.62;
        const x = (SZ - logoSize) / 2;
        const y = (SZ - logoSize) / 2 - SZ * 0.02;
        ctx.drawImage(logoImg, x, y, logoSize, logoSize);
      } else if (label) {
        ctx.fillStyle = brandHex;
        ctx.font = `700 ${SZ * 0.19}px "Space Grotesk", system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, SZ / 2, SZ / 2);
      }

      if (label) {
        ctx.font = `600 ${SZ * 0.063}px "JetBrains Mono", ui-monospace, monospace`;
        ctx.fillStyle = "rgba(20,20,30,0.65)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label.toUpperCase(), SZ / 2, SZ * 0.9);
      }

      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = ANISOTROPY;
      return tex;
    }

    // ── Game tile texture ────────────────────────────────
    const SI = "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons";
    const gameRealLogos = {
      valorant:  { url: `${SI}/valorant.svg`,              mode: "tint" },
      cs2:       { url: `${SI}/counterstrike.svg`,         mode: "tint" },
      minecraft: { url: `${SI}/minecraft.svg`,             mode: "tint" },
      deadlock:  { url: "assets/games/deadlock.png",       mode: "plain" },
      kingdoms:  { url: "assets/games/kingdoms-reborn.png", mode: "plain" },
    };

    function fitImageToCanvas(img) {
      const tmp = document.createElement("canvas");
      tmp.width = SZ; tmp.height = SZ;
      const tctx = tmp.getContext("2d");
      const ratio = (img.naturalWidth || img.width) / (img.naturalHeight || img.height) || 1;
      let w = SZ, h = SZ;
      if (ratio > 1) h = SZ / ratio; else w = SZ * ratio;
      tctx.drawImage(img, (SZ - w) / 2, (SZ - h) / 2, w, h);
      return { canvas: tmp, ctx: tctx, size: SZ };
    }

    function loadColoredIcon(url, brand) {
      return loadImg(url).then((img) => {
        const { canvas, ctx: tctx } = fitImageToCanvas(img);
        tctx.globalCompositeOperation = "source-in";
        tctx.fillStyle = brand;
        tctx.fillRect(0, 0, SZ, SZ);
        return canvas;
      });
    }

    function loadPlainLogo(url) {
      return loadImg(url).then((img) => fitImageToCanvas(img).canvas);
    }

    function gameLogoSvg(game) {
      const c = game.brand;
      switch (game.id) {
        case "valorant":
          return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="${c}" d="M 6 12 L 28 12 L 50 78 L 50 96 Z"/><path fill="${c}" d="M 94 12 L 72 12 L 50 78 L 50 96 Z"/></svg>`;
        case "cs2":
          return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round"><circle cx="50" cy="50" r="36"/><line x1="50" y1="6" x2="50" y2="30"/><line x1="50" y1="70" x2="50" y2="94"/><line x1="6" y1="50" x2="30" y2="50"/><line x1="70" y1="50" x2="94" y2="50"/></g><circle cx="50" cy="50" r="5" fill="${c}"/></svg>`;
        case "minecraft":
          return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><path fill="${c}" d="M 50 8 L 88 28 L 50 48 L 12 28 Z"/><path fill="${c}" fill-opacity="0.55" d="M 12 28 L 12 70 L 50 92 L 50 50 Z"/><path fill="${c}" fill-opacity="0.82" d="M 88 28 L 88 70 L 50 92 L 50 50 Z"/><path fill="none" stroke="${c}" stroke-width="2" stroke-opacity="0.9" d="M 50 8 L 88 28 L 50 48 L 12 28 Z M 12 28 L 12 70 L 50 92 L 88 70 L 88 28 M 50 48 L 50 92"/></g></svg>`;
        case "deadlock":
          return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round" d="M 30 50 L 30 32 Q 30 14 50 14 Q 70 14 70 32 L 70 50"/><rect x="18" y="48" width="64" height="44" rx="7" fill="${c}"/><rect x="44" y="62" width="12" height="18" rx="2" fill="#0a0a10"/></svg>`;
        case "kingdoms":
          return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="${c}" d="M 12 76 L 22 30 L 36 54 L 50 18 L 64 54 L 78 30 L 88 76 Z"/><rect x="12" y="78" width="76" height="10" fill="${c}"/><circle cx="22" cy="28" r="5" fill="${c}"/><circle cx="50" cy="16" r="5" fill="${c}"/><circle cx="78" cy="28" r="5" fill="${c}"/><circle cx="50" cy="58" r="4" fill="#0a0a10" opacity="0.4"/></svg>`;
      }
      return null;
    }
    function svgToDataUrl(svgStr) {
      return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
    }

    function drawGameTile(canvas, game, logoImg) {
      const tSZ = canvas.width;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, tSZ, tSZ);

      const bg = ctx.createRadialGradient(tSZ * 0.3, tSZ * 0.3, 40, tSZ / 2, tSZ / 2, tSZ * 0.95);
      bg.addColorStop(0, "#1c1c28");
      bg.addColorStop(1, "#07070c");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, tSZ, tSZ);

      const glow = ctx.createRadialGradient(tSZ / 2, tSZ * 0.42, 50, tSZ / 2, tSZ * 0.42, tSZ * 0.75);
      glow.addColorStop(0, hexAlpha(game.brand, 0.55));
      glow.addColorStop(0.5, hexAlpha(game.brand, 0.15));
      glow.addColorStop(1, hexAlpha(game.brand, 0.0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, tSZ, tSZ);

      ctx.strokeStyle = hexAlpha(game.brand, 0.10);
      ctx.lineWidth = 1;
      const step = tSZ / 8;
      for (let i = 0; i <= 8; i++) {
        ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, tSZ); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(tSZ, i * step); ctx.stroke();
      }

      ctx.strokeStyle = hexAlpha(game.brand, 0.45);
      ctx.lineWidth = 2;
      ctx.strokeRect(22, 22, tSZ - 44, tSZ - 44);
      ctx.strokeStyle = game.brand;
      ctx.lineWidth = 3;
      const cz = 28;
      [[22, 22, 1, 1], [tSZ - 22, 22, -1, 1], [22, tSZ - 22, 1, -1], [tSZ - 22, tSZ - 22, -1, -1]].forEach(([x, y, dx, dy]) => {
        ctx.beginPath();
        ctx.moveTo(x, y + dy * cz);
        ctx.lineTo(x, y);
        ctx.lineTo(x + dx * cz, y);
        ctx.stroke();
      });

      if (logoImg) {
        const sz = tSZ * 0.5;
        const x = (tSZ - sz) / 2;
        const y = tSZ * 0.44 - sz / 2;
        ctx.save();
        ctx.shadowColor = hexAlpha(game.brand, 0.7);
        ctx.shadowBlur = 30;
        ctx.drawImage(logoImg, x, y, sz, sz);
        ctx.restore();
      } else {
        ctx.fillStyle = game.brand;
        const initial = game.initial;
        const fs = initial.length === 1 ? tSZ * 0.59 : tSZ * 0.43;
        ctx.font = `800 ${fs}px "Space Grotesk", system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = hexAlpha(game.brand, 0.9);
        ctx.shadowBlur = 40;
        ctx.fillText(initial, tSZ / 2, tSZ * 0.44);
        ctx.shadowBlur = 0;
      }

      ctx.font = `600 ${tSZ * 0.055}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(game.label.toUpperCase(), tSZ / 2, tSZ * 0.88);
    }

    function makeGameTileTexture(game) {
      const c = document.createElement("canvas");
      c.width = SZ; c.height = SZ;
      drawGameTile(c, game, null);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = ANISOTROPY;
      return { tex, canvas: c };
    }

    function hexAlpha(hex, a) {
      const h = hex.replace("#", "");
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return `rgba(${r},${g},${b},${a})`;
    }

    // ── Tech catalog ──────────────────────────────────────
    const DEVICON = "https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons";
    const techs = [
      { id: "react",      label: "React",      brand: "#61DAFB", url: `${DEVICON}/react/react-original.svg` },
      { id: "python",     label: "Python",     brand: "#3776AB", url: `${DEVICON}/python/python-original.svg` },
      { id: "typescript", label: "TypeScript", brand: "#3178C6", url: `${DEVICON}/typescript/typescript-original.svg` },
      { id: "javascript", label: "JavaScript", brand: "#F7DF1E", url: `${DEVICON}/javascript/javascript-original.svg` },
      { id: "laravel",    label: "Laravel",    brand: "#FF2D20", url: `${DEVICON}/laravel/laravel-original.svg` },
      { id: "nodejs",     label: "Node.js",    brand: "#539E43", url: `${DEVICON}/nodejs/nodejs-original.svg` },
      { id: "fastapi",    label: "FastAPI",    brand: "#009688", url: `${DEVICON}/fastapi/fastapi-original.svg` },
      { id: "flask",      label: "Flask",      brand: "#000000", url: `${DEVICON}/flask/flask-original.svg` },
      { id: "mysql",      label: "MySQL",      brand: "#00758F", url: `${DEVICON}/mysql/mysql-original.svg` },
      { id: "git",        label: "Git",        brand: "#F05032", url: `${DEVICON}/git/git-original.svg` },
      { id: "aws",        label: "AWS",        brand: "#FF9900", url: `${DEVICON}/amazonwebservices/amazonwebservices-original-wordmark.svg` },
      { id: "php",        label: "PHP",        brand: "#777BB4", url: `${DEVICON}/php/php-original.svg` },
    ];

    // ── Games catalog ─────────────────────────────────────
    const games = [
      { id: "valorant",  label: "Valorant",         brand: "#FF4655", initial: "V"  },
      { id: "deadlock",  label: "Deadlock",         brand: "#C77B3C", initial: "D"  },
      { id: "cs2",       label: "CS2",              brand: "#F2A329", initial: "CS" },
      { id: "minecraft", label: "Minecraft",        brand: "#5D8C3D", initial: "M"  },
      { id: "kingdoms",  label: "Kingdoms Reborn",  brand: "#D4A24C", initial: "K"  },
    ];

    // ── Layout ────────────────────────────────────────────
    const layoutFull = [
      { id: "react",      pos: [1.0, -0.1, 0.6],   rot: [-0.08, -0.18, 0.04], scale: 1.45 },
      { id: "python",     pos: [-1.4, 0.5, 0.2],   rot: [0.1, 0.22, -0.06],   scale: 1.35 },
      { id: "typescript", pos: [2.8, 1.4, -0.4],   rot: [0.1, -0.35, 0.08],   scale: 0.85 },
      { id: "javascript", pos: [-3.0, -1.4, -0.2], rot: [0.15, 0.4, -0.1],    scale: 0.82 },
      { id: "nodejs",     pos: [-2.8, 1.5, -0.6],  rot: [0.18, -0.2, 0.12],   scale: 0.84 },
      { id: "fastapi",    pos: [2.6, -1.4, 0.3],   rot: [-0.15, 0.3, -0.05],  scale: 0.82 },
      { id: "flask",      pos: [-3.8, 0.3, -1.0],  rot: [0.05, -0.5, 0.18],   scale: 0.72 },
      { id: "mysql",      pos: [3.8, 0.4, -1.0],   rot: [0.08, 0.5, -0.15],   scale: 0.72 },
      { id: "aws",        pos: [0.4, -2.2, -0.5],  rot: [-0.25, 0.1, -0.08],  scale: 0.72 },
      { id: "git",        pos: [-0.6, 2.2, -0.7],  rot: [0.22, -0.1, 0.08],   scale: 0.70 },
    ];

    const layoutMobile = [
      { id: "react",      pos: [0.8, -0.1, 0.6],   rot: [-0.08, -0.18, 0.04], scale: 1.2  },
      { id: "python",     pos: [-1.2, 0.5, 0.2],   rot: [0.1, 0.22, -0.06],   scale: 1.1  },
      { id: "typescript", pos: [2.2, 1.2, -0.4],   rot: [0.1, -0.35, 0.08],   scale: 0.75 },
      { id: "javascript", pos: [-2.4, -1.2, -0.2], rot: [0.15, 0.4, -0.1],    scale: 0.72 },
      { id: "nodejs",     pos: [0.2, -2.0, -0.5],  rot: [-0.25, 0.1, -0.08],  scale: 0.68 },
    ];

    const layout = mobile ? layoutMobile : layoutFull;

    // ── Build chips ───────────────────────────────────────
    const group = new THREE.Group();
    scene.add(group);
    const chips = [];
    const baseGeom = chipGeom(1.6, 1.6);
    const techMap = {};
    techs.forEach((t) => { techMap[t.id] = t; });

    function placeholderTex(brand, label) {
      return makeTileTexture(null, brand, label);
    }

    function makeChip(tech, item, texture) {
      let mat;
      if (mobile) {
        mat = new THREE.MeshStandardMaterial({
          map: texture,
          color: 0xffffff,
          roughness: 0.4,
          metalness: 0.05,
          envMapIntensity: 0.5,
          side: THREE.DoubleSide,
        });
      } else {
        mat = new THREE.MeshPhysicalMaterial({
          map: texture,
          color: 0xffffff,
          roughness: 0.32,
          metalness: 0.0,
          clearcoat: 0.95,
          clearcoatRoughness: 0.12,
          envMapIntensity: 1.25,
          transmission: 0.06,
          thickness: 0.4,
          ior: 1.45,
          side: THREE.DoubleSide,
        });
      }
      const mesh = new THREE.Mesh(baseGeom, mat);
      mesh.position.set(...item.pos);
      mesh.rotation.set(...item.rot);
      mesh.scale.setScalar(item.scale);
      mesh.userData = {
        basePos: new THREE.Vector3(...item.pos),
        baseRot: new THREE.Euler(...item.rot),
        floatSpeed: 0.35 + Math.random() * 0.4,
        floatAmp: 0.1 + Math.random() * 0.1,
        offset: Math.random() * Math.PI * 2,
        spinSpeed: (Math.random() - 0.5) * 0.35,
        mat,
        techTexture: texture,
      };
      chips.push(mesh);
      group.add(mesh);
      return mesh;
    }

    for (const item of layout) {
      const tech = techMap[item.id];
      if (!tech) continue;
      makeChip(tech, item, placeholderTex(tech.brand, tech.label));
    }

    for (let i = 0; i < layout.length; i++) {
      const item = layout[i];
      const tech = techMap[item.id];
      const mesh = chips[i];
      if (!tech || !mesh) continue;
      loadImg(tech.url).then((img) => {
        const tex = makeTileTexture(img, tech.brand, tech.label);
        mesh.userData.techTexture = tex;
        if (currentMode === "tech") {
          mesh.userData.mat.map = tex;
          mesh.userData.mat.needsUpdate = true;
        }
      }).catch(() => {});
    }

    // ── Pre-build game textures ───────────────────────────
    const gameTiles = games.map(makeGameTileTexture);
    const gameTextures = gameTiles.map((t) => t.tex);
    for (let i = 0; i < games.length; i++) {
      const g = games[i];
      const upgrade = (logoCanvasOrImg) => {
        drawGameTile(gameTiles[i].canvas, g, logoCanvasOrImg);
        gameTextures[i].needsUpdate = true;
      };
      const real = gameRealLogos[g.id];
      const tryReal = real
        ? (real.mode === "tint" ? loadColoredIcon(real.url, g.brand) : loadPlainLogo(real.url))
        : Promise.reject();
      tryReal.then(upgrade).catch(() => {
        const svg = gameLogoSvg(g);
        if (!svg) return;
        loadImg(svgToDataUrl(svg)).then(upgrade).catch(() => {});
      });
    }

    let currentMode = "tech";
    function setMode(mode) {
      if (mode === currentMode) return;
      currentMode = mode;
      for (let i = 0; i < chips.length; i++) {
        const m = chips[i];
        m.userData.mat.map = (mode === "games")
          ? gameTextures[i % gameTextures.length]
          : m.userData.techTexture;
        m.userData.mat.needsUpdate = true;
      }
    }

    // ── Interaction ───────────────────────────────────────
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    window.addEventListener("pointermove", (e) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    });

    let scrollY = 0;
    function onScroll() {
      scrollY = window.scrollY;
      const vh = window.innerHeight;
      const fadeStart = vh * 0.55;
      const fadeEnd = vh * 1.05;
      const tFade = Math.max(0, Math.min(1, (scrollY - fadeStart) / (fadeEnd - fadeStart)));
      canvas.style.opacity = String(1 - tFade * 0.85);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // ── Animation loop ────────────────────────────────────
    const clock = new THREE.Clock();
    let lastFrame = 0;
    let rafId = null;
    let firstRender = true;

    function animate(ts) {
      rafId = requestAnimationFrame(animate);

      if (FRAME_MS && ts - lastFrame < FRAME_MS) return;
      lastFrame = ts;

      const t = clock.getElapsedTime();
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      group.rotation.y = t * 0.05 + mouse.x * 0.35;
      group.rotation.x = mouse.y * 0.18;

      for (const m of chips) {
        const ud = m.userData;
        m.position.y = ud.basePos.y + Math.sin(t * ud.floatSpeed + ud.offset) * ud.floatAmp;
        m.position.x = ud.basePos.x + Math.cos(t * ud.floatSpeed * 0.7 + ud.offset) * ud.floatAmp * 0.6;
        m.rotation.y = ud.baseRot.y + Math.sin(t * ud.floatSpeed * 0.5 + ud.offset) * 0.18 + t * ud.spinSpeed * 0.3;
        m.rotation.x = ud.baseRot.x + Math.cos(t * ud.floatSpeed * 0.6 + ud.offset) * 0.08;
      }

      const scrollProg = Math.min(scrollY / window.innerHeight, 3);
      camera.position.z = CAM_Z + scrollProg * 1.2;
      camera.position.y = -scrollProg * 0.6;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);

      if (firstRender && mobile) {
        firstRender = false;
        canvas.style.opacity = "";
      }
    }
    animate(0);

    // ── Layout shifts per hero variant ────────────────────
    window.__scene3d = {
      setLayout(layoutName) {
        if (layoutName === "centered") {
          group.position.set(0, 0, 0);
        } else if (layoutName === "split") {
          group.position.set(mobile ? 0 : 2.6, 0, 0);
        } else if (layoutName === "overlay") {
          group.position.set(mobile ? 0 : 1.4, 0.4, 0);
        }
      },
      setMode,
    };
  }

  if (isMobile) {
    // Keep canvas hidden until scene renders its first frame (avoids flash before 3D is ready)
    canvas.style.display = "block";
    canvas.style.opacity = "0";
    const start = () => initScene(true);
    if ("requestIdleCallback" in window) {
      requestIdleCallback(start, { timeout: 1500 });
    } else {
      setTimeout(start, 600);
    }
  } else {
    initScene(false);
  }
})();
