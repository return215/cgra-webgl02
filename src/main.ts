import vertProgram from "./main.vert";
import fragProgram from "./main.frag";
import * as twgl from "twgl.js";
import { deg2Rad, convertCornerToCenter, showDecimalPoints } from "./utils";
import { mat4, vec3 } from "gl-matrix";

type ShaderType = WebGLRenderingContext["VERTEX_SHADER"] | WebGLRenderingContext["FRAGMENT_SHADER"];

/** ignore function return value */
// @ts-ignore 6133 explicit ignore function return value
let _ : unknown;

function createShader(gl: WebGLRenderingContext, type: ShaderType, source: string)
  : WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader)
    return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(
      `Could not compile WebGL shader.

      ${gl.getShaderInfoLog(shader)}
      `);
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vertShader: WebGLShader, fragShader: WebGLShader)
  : WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(
      `Could not compile WebGL program.
    
      ${gl.getProgramInfoLog(program)}
      `);
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function main(): void {
  // --- PREPARE --- //
  //#region

  const canvas = document.querySelector<HTMLCanvasElement>("#canvas");
  if (!canvas) {
    console.error(
      `Unable to get the canvas element. Either your HTML broke or the dev being stupid.
      Report this to the dev ASAP.
      `);
    return;
  }

  const timeScaleElem = document.querySelector<HTMLParagraphElement>("#timeScale");

  const gl = canvas.getContext("webgl");
  if (!gl) {
    console.error(
      `Unable to load WebGL context from canvas. Perhaps your browser doesn't support it. Stopping.
      `);
    return;
  }

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertProgram);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragProgram);
  if (!vertexShader || !fragmentShader) {
    console.error("Unable to compile shaders. Stopping.");
    return;
  }

  const program = createProgram(gl, vertexShader, fragmentShader);
  if (!program) {
    console.error("Unable to create WebGLProgram. Stopping.");
    return;
  }
  gl.useProgram(program);
  //#endregion

  // --- THE DATA --- //
  //#region
  // position
  const verts3D = [
    // from bottom left front to top right back
    [0, 0, 0],
    [0, 0, 1],
    [0, 1, 0],
    [0, 1, 1],
    [1, 0, 0],
    [1, 0, 1],
    [1, 1, 0],
    [1, 1, 1],
  ];

  // create a cube from the vertices above
  const pos = new Float32Array([
    // left face
    verts3D[0],
    verts3D[1],
    verts3D[2],
    verts3D[3],
    verts3D[1],
    verts3D[2],

    // back face
    verts3D[3],
    verts3D[7],
    verts3D[1],
    verts3D[5],
    verts3D[7],
    verts3D[1],

    // top face
    verts3D[6],
    verts3D[7],
    verts3D[2],
    verts3D[3],
    verts3D[7],
    verts3D[2],

    // right face
    verts3D[4],
    verts3D[5],
    verts3D[6],
    verts3D[7],
    verts3D[5],
    verts3D[6],

    // front face
    verts3D[0],
    verts3D[4],
    verts3D[2],
    verts3D[6],
    verts3D[4],
    verts3D[2],

    // bottom face
    verts3D[0],
    verts3D[1],
    verts3D[4],
    verts3D[5],
    verts3D[1],
    verts3D[4],

  ].flat().map(convertCornerToCenter));

  // color
  const stellaColors = [
    92, 151, 255, 255,
    196, 92, 255, 255,
    115, 92, 255, 255,
  ];
  const revalxColors = [
    236, 247, 2, 255,
    247, 135, 2, 255,
    247, 13, 2, 255,
  ];
  const neoColors = [
    36, 247, 150, 255,
    36, 238, 247, 255,
    36, 133, 247, 255,
  ];
  const allColors = [
    stellaColors, 
    revalxColors, 
    neoColors, 
  ];

  //#endregion

  // --- RENDERING --- //

  // prepare for rendering
  const canvasAspectRatio = canvas.width / canvas.height;
  const resized = twgl.resizeCanvasToDisplaySize(canvas, window.devicePixelRatio);
  console.log(`Canvas ${resized ? 'was' : 'already'} resized to ${canvas.width}x${canvas.height}.`);
  gl.viewport(0, 0, canvas.width, canvas.height);
  // enable culling and depth testing
  // gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  // render loop
  function render(gl: WebGLRenderingContext, program: WebGLProgram) {
    let startTime: number | null = null;
    let previousTime: number;
    let elapsedTime: number = 0;
    let timeScale = 1.0;
    let shrinkTimeScale = true;
    const posBuffer = gl.createBuffer()!!;
    const colBuffer = gl.createBuffer()!!;
    const colNextBuffer = gl.createBuffer()!!;
    const m4Proj = mat4.create();
    const m4view = mat4.create();

    const attrPos = gl.getAttribLocation(program, "a_Pos");
    const attrCol = gl.getAttribLocation(program, "a_Col");
    const attrColNext = gl.getAttribLocation(program, "a_ColNext");
    const unifViewProj = gl.getUniformLocation(program, "u_ViewProj");
    const unifTime = gl.getUniformLocation(program, "u_Time");

    // set positions buffer
    gl.enableVertexAttribArray(attrPos);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
    gl.vertexAttribPointer(attrPos, 3, gl.FLOAT, false, 0, 0);

    // set initial camera position
    let cameraFov = 80;
    const cameraPosition = vec3.fromValues(1, 1, 1);
    const cameraLookAt = vec3.fromValues(0, 0, 0);

    // set projection
    const projData = {
      fieldOfView: deg2Rad(cameraFov),
      aspect: canvasAspectRatio,
      near: 0.0001,
      far: 1000,
    };
    _ = mat4.perspective(m4Proj, projData.fieldOfView, projData.aspect, projData.near, projData.far);

    // set view
    const viewData = {
      cameraPosition: cameraPosition,
      target: cameraLookAt,
      up: vec3.fromValues(0, 1, 0),
    }
    _ = mat4.lookAt(m4view, viewData.cameraPosition, viewData.target, viewData.up);

    // set view projection
    /** view projection matrix
     * defined here to avoid recalculating previous state
     */
    const m4viewProj = mat4.create();
    _ = mat4.multiply(m4viewProj, m4view, m4Proj);

    // add key listener
    document.addEventListener("keydown", (e) => {
      switch(e.code) {
        // WASD for camera movement on X and Z
        case "KeyW":
          _ = mat4.translate(m4viewProj, m4viewProj, vec3.fromValues(0, 0, 0.01));
          break;
        case "KeyS":
          _ = mat4.translate(m4viewProj, m4viewProj, vec3.fromValues(0, 0, -0.01));
          break;
        case "KeyA":
          _ = mat4.translate(m4viewProj, m4viewProj, vec3.fromValues(-0.01, 0, 0));
          break;
        case "KeyD":
          _ = mat4.translate(m4viewProj, m4viewProj, vec3.fromValues(0.01, 0, 0));
          break;
    
        // IJKL for camera rotation along X and Y
        case "KeyI":
          _ = mat4.rotateX(m4viewProj, m4viewProj, deg2Rad(1));
          break;
        case "KeyK":
          _ = mat4.rotateX(m4viewProj, m4viewProj, deg2Rad(-1));
          break;
        case "KeyJ":
          _ = mat4.rotateY(m4viewProj, m4viewProj, deg2Rad(1));
          break;
        case "KeyL":
          _ = mat4.rotateY(m4viewProj, m4viewProj, deg2Rad(-1));
          break;
        // P and ; for camera movement on Y
        case "KeyP":
          _ = mat4.translate(m4viewProj, m4viewProj, vec3.fromValues(0, 0.01, 0));
          break;
        case "Semicolon":
          _ = mat4.translate(m4viewProj, m4viewProj, vec3.fromValues(0, -0.01, 0));
          break;
        // [ and ' for camera FOV incease or decrease
        case "BracketLeft":
          cameraFov -= 0.5;
          break;
        case "BracketRight":
          cameraFov += 0.5;
          break;

        case "Enter":
          console.log(m4viewProj);
      }
    });
    

    return function doRender() {
      // initialize time if haven't
      if (!startTime) {
        previousTime = startTime = performance.now();
      }

      // set time scale uniform
      const currentTime = performance.now();
      elapsedTime += ((currentTime - previousTime) / 1000.0) * timeScale; // Convert to seconds
      previousTime = currentTime;
      if (timeScaleElem)
        timeScaleElem.textContent = `
          Time scale = ${showDecimalPoints(timeScale)} |
          Current time = ${showDecimalPoints((currentTime - startTime) / 1000.0)}
        `;

      // scale time
      if (timeScale < 2 / 10 || timeScale > 10 / 2)
        shrinkTimeScale = !shrinkTimeScale;

      if (shrinkTimeScale)
        timeScale *= 99 / 100;
      else
        timeScale *= 100 / 99;

      if (unifTime)
        gl.uniform1f(unifTime, elapsedTime);

      // set colors buffer
      /* 
      tri0 : 0 -> 1 -> 2 -> 0
      tri1 : 1 -> 2 -> 0 -> 1
      tri2 : 2 -> 0 -> 1 -> 2
      */
      gl.enableVertexAttribArray(attrCol);
      gl.bindBuffer(gl.ARRAY_BUFFER, colBuffer);
      const colors = new Uint8Array([
        allColors[Math.floor(elapsedTime + 0) % 3],
        allColors[Math.floor(elapsedTime + 1) % 3],
        allColors[Math.floor(elapsedTime + 2) % 3],
        allColors[Math.floor(elapsedTime + 0) % 3],
        allColors[Math.floor(elapsedTime + 1) % 3],
        allColors[Math.floor(elapsedTime + 2) % 3],
        allColors[Math.floor(elapsedTime + 0) % 3],
        allColors[Math.floor(elapsedTime + 1) % 3],
        allColors[Math.floor(elapsedTime + 2) % 3],
        allColors[Math.floor(elapsedTime + 0) % 3],
        allColors[Math.floor(elapsedTime + 1) % 3],
        allColors[Math.floor(elapsedTime + 2) % 3],
      ].flat());
      gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(attrCol, 4, gl.UNSIGNED_BYTE, true, 0, 0);

      // set next colors buffer
      gl.enableVertexAttribArray(attrColNext);
      gl.bindBuffer(gl.ARRAY_BUFFER, colNextBuffer);
      const nextColors = new Uint8Array([
        allColors[Math.floor(elapsedTime + 1) % 3],
        allColors[Math.floor(elapsedTime + 2) % 3],
        allColors[Math.floor(elapsedTime + 0) % 3],
        allColors[Math.floor(elapsedTime + 1) % 3],
        allColors[Math.floor(elapsedTime + 2) % 3],
        allColors[Math.floor(elapsedTime + 0) % 3],
        allColors[Math.floor(elapsedTime + 1) % 3],
        allColors[Math.floor(elapsedTime + 2) % 3],
        allColors[Math.floor(elapsedTime + 0) % 3],
        allColors[Math.floor(elapsedTime + 1) % 3],
        allColors[Math.floor(elapsedTime + 2) % 3],
        allColors[Math.floor(elapsedTime + 0) % 3],
      ].flat());
      gl.bufferData(gl.ARRAY_BUFFER, nextColors, gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(attrColNext, 4, gl.UNSIGNED_BYTE, true, 0, 0);



      // set view projection uniform
      if (unifViewProj)
        gl.uniformMatrix4fv(unifViewProj, false, m4viewProj);

      // do drawing
      gl.clearColor(1, 1, 1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, pos.length / 3);

      // recursively do render
      requestAnimationFrame(doRender)
    }
  }

  render(gl, program)();

  console.log('done');

}

main()
