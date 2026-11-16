// The UI only depends on mountMascot(), so this renderer can be swapped for a model.

const VERTEX = `
  attribute vec3 position;
  attribute vec3 normal;
  uniform vec3 center, size;
  uniform vec2 tilt;
  uniform float lift, scale;
  varying vec3 lightNormal;
  mat3 pose() {
    float c = cos(tilt.x), s = sin(tilt.x), d = cos(tilt.y), t = sin(tilt.y);
    return mat3(c, s*t, -s*d, 0.0, d, t, s, -c*t, c*d);
  }
  void main() {
    mat3 rotation = pose();
    vec3 point = rotation * (position * size + center);
    lightNormal = rotation * (normal / size);
    gl_Position = vec4(point.xy * scale + vec2(0.0, lift), -point.z * 0.23, 1.0);
  }
`;
const FRAGMENT = `
  precision mediump float;
  varying vec3 lightNormal;
  uniform vec3 tint;
  void main() {
    vec3 n = normalize(lightNormal);
    vec3 key = normalize(vec3(-0.5, 0.9, 1.0));
    float diffuse = max(dot(n, key), 0.0);
    float shine = pow(max(dot(n, normalize(key + vec3(0.0,0.0,1.0))), 0.0), 22.0);
    float rim = pow(1.0 - max(n.z, 0.0), 3.0) * 0.095;
    gl_FragColor = vec4(tint * (0.63 + diffuse * 0.43) + rim + shine * 0.16, 1.0);
  }
`;

function surface(columns, rows, point) {
  const vertices = [];
  const vertex = (u, v) => vertices.push(...point(u / columns, v / rows));
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      vertex(x, y); vertex(x + 1, y); vertex(x, y + 1);
      vertex(x + 1, y); vertex(x + 1, y + 1); vertex(x, y + 1);
    }
  }
  return new Float32Array(vertices);
}

const sphere = () => surface(16, 10, (u, v) => {
  const a = u * Math.PI * 2, b = v * Math.PI;
  const point = [Math.cos(a) * Math.sin(b), Math.cos(b), Math.sin(a) * Math.sin(b)];
  return [...point, ...point];
});
const horn = side => surface(12, 8, (u, v) => {
  const angle = u * Math.PI * 2;
  const x = .58 + .66 * v - .09 * v ** 2;
  const y = .44 + .06 * v + .62 * v ** 2;
  const dx = .66 - .18 * v, dy = .06 + 1.24 * v, length = Math.hypot(dx, dy);
  const nx = -dy / length * Math.cos(angle), ny = dx / length * Math.cos(angle), nz = Math.sin(angle);
  const radius = .23 * (1 - v) ** .85 + .012;
  return [side * (x + nx * radius), y + ny * radius, .11 + nz * radius, side * nx, ny, nz];
});

const ceramic = [.21, .35, .49];
const brass = [.94, .64, .31];
const gold = [1, .79, .43];
const nose = [.48, .65, .72];
const rubber = [.14, .23, .34];
const glow = [.61, 1, .91];

function compile(gl, type, text) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, text);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error("Mascot shader unavailable");
  return shader;
}

export function mountMascot(canvas, trigger, fallback) {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: true, powerPreference: "low-power" });
  if (!gl) return null;
  const program = gl.createProgram();
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  gl.enable(gl.DEPTH_TEST);
  const position = gl.getAttribLocation(program, "position");
  const normal = gl.getAttribLocation(program, "normal");
  gl.enableVertexAttribArray(position);
  gl.enableVertexAttribArray(normal);
  const uniforms = Object.fromEntries(["center", "size", "tint", "lift", "tilt", "scale"].map(
    name => [name, gl.getUniformLocation(program, name)],
  ));
  const upload = vertices => {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    return { buffer, count: vertices.length / 6 };
  };
  const round = upload(sphere()), left = upload(horn(-1)), right = upload(horn(1));
  const part = (mesh, center, size, tint) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
    gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(normal, 3, gl.FLOAT, false, 24, 12);
    gl.uniform3fv(uniforms.center, center);
    gl.uniform3fv(uniforms.size, size);
    gl.uniform3fv(uniforms.tint, tint);
    gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
  };

  const quiet = matchMedia("(prefers-reduced-motion: reduce)");
  let parked = false, lost = false, frame = 0, last = 0, cursorX = 0, cursorY = 0;
  let phase = "idle", start = performance.now(), yaw = 0, pitch = 0;
  function draw(now) {
    const width = Math.min(132, Math.round(canvas.clientWidth * Math.min(devicePixelRatio || 1, 2)));
    if (width < 1) return;
    if (canvas.width !== width || canvas.height !== width) canvas.width = canvas.height = width;
    gl.viewport(0, 0, width, width);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const time = quiet.matches ? 0 : now / 1000;
    const elapsed = (now - start) / 1000;
    const wave = Math.sin(time * 2.1);
    let lift = .025 * wave;
    let goalX = cursorX * .26 + Math.sin(time * 1.2) * .09;
    let goalY = -cursorY * .23;
    if (phase === "opening") { lift += Math.sin(elapsed * 4.9) * .11 * Math.exp(-elapsed * 1.7); goalY -= .14; }
    if (phase === "thinking") { lift += Math.sin(time * 6) * .045; goalX += Math.sin(time * 4) * .18; goalY += .15; }
    if (phase === "responding") lift += Math.abs(Math.sin(elapsed * 5)) * .14 * Math.exp(-elapsed * 1.5);
    if (phase === "error") goalX += Math.sin(elapsed * 28) * .17 * Math.exp(-elapsed * 3);
    yaw += (goalX - yaw) * .22;
    pitch += (goalY - pitch) * .22;
    gl.uniform2f(uniforms.tilt, quiet.matches ? 0 : yaw, quiet.matches ? 0 : pitch);
    gl.uniform1f(uniforms.lift, (quiet.matches ? 0 : lift) - .07);
    gl.uniform1f(uniforms.scale, .69 + .012 * wave);
    part(left, [0, 0, 0], [1, 1, 1], gold);
    part(right, [0, 0, 0], [1, 1, 1], gold);
    const dot = (center, size, color) => part(round, center, size, color);
    dot([0, -.01, 0], [.79, .69, .55], ceramic);
    dot([0, -.08, .35], [.72, .5, .31], rubber);
    dot([0, -.43, .39], [.55, .31, .42], nose);
    dot([0, .42, .41], [.21, .16, .17], brass);
    dot([0, .44, .57], [.065, .08, .032], gold);
    const blink = quiet.matches ? 1 : Math.max(.11, Math.min(1, Math.abs(time % 3.9 - 3.55) * 10));
    const eye = phase === "error" ? [1, .59, .42] : glow;
    for (const side of [-1, 1]) {
      dot([side * .79, -.04, 0], [.24, .17, .13], ceramic);
      dot([side * .77, -.045, .08], [.18, .115, .098], brass);
      dot([side * .34, .095, .62], [.183, .12, .105], ceramic);
      dot([side * .34, .095, .69], [.114, .073 * blink, .051], eye);
      dot([side * .21, -.41, .77], [.084, .048, .035], rubber);
    }
    dot([0, -.57, .747], [.15, .036, .038], rubber);
    dot([0, -.6, .756], [.055, .022, .022], gold);
  }

  function tick(now) {
    frame = 0;
    if (lost || parked || document.hidden || !canvas.isConnected) return;
    if (now - last >= 31 || quiet.matches) { draw(now); last = now; }
    if (!quiet.matches) frame = requestAnimationFrame(tick);
  }
  function wake() {
    if (!frame && !lost && !parked && !document.hidden) frame = requestAnimationFrame(tick);
  }
  trigger.addEventListener("pointermove", event => {
    if (event.pointerType === "touch" || quiet.matches) return;
    const area = trigger.getBoundingClientRect();
    cursorX = (event.clientX - area.left) / area.width * 2 - 1;
    cursorY = (event.clientY - area.top) / area.height * 2 - 1;
  });
  trigger.addEventListener("pointerleave", () => { cursorX = cursorY = 0; });
  canvas.addEventListener("webglcontextlost", () => { lost = true; canvas.hidden = true; fallback.hidden = false; }, { once: true });
  quiet.addEventListener("change", wake);
  document.addEventListener("visibilitychange", wake);
  new ResizeObserver(wake).observe(trigger);
  canvas.hidden = false;
  fallback.hidden = true;
  wake();
  return {
    state(next) { phase = next; start = performance.now(); wake(); },
    pause(value) { parked = value; if (!parked) wake(); },
  };
}
