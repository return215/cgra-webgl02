import vertProgram from "./main.vert";
import fragProgram from "./main.frag";
import * as twgl from "twgl.js";
import { scaleToBottomLeft, showDecimalPoints } from "./utils";
import { mat4 } from "gl-matrix";

type ShaderType = WebGLRenderingContext["VERTEX_SHADER"] | WebGLRenderingContext["FRAGMENT_SHADER"];

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
    [4/8, 4/8, 7/8,],
    [1/8, 1/8, 4/8,],
    [7/8, 1/8, 4/8,],
    [4/8, 7/8, 4/8,],
    [4/8, 4/8, 1/8,],
  ]
  const pos = new Float32Array([
    verts3D[0],
    verts3D[1],
    verts3D[2],

    verts3D[0],
    verts3D[2],
    verts3D[3],

    verts3D[0],
    verts3D[3],
    verts3D[1],

    verts3D[4],
    verts3D[1],
    verts3D[2],

    verts3D[4],
    verts3D[2],
    verts3D[3],

    verts3D[4],
    verts3D[3],
    verts3D[1],
  ].flat().map(scaleToBottomLeft));

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
  const botColors = [stellaColors.slice(4,8), revalxColors.slice(4,8), neoColors.slice(4,8)].flat();
  const allColors = [stellaColors, revalxColors, neoColors, stellaColors, revalxColors, neoColors];

  const m4 = mat4.create();
  //#endregion

  // --- RENDERING --- //

  // prepare for rendering
  const resized = twgl.resizeCanvasToDisplaySize(canvas, window.devicePixelRatio);
  console.log(`Canvas ${resized ? 'was' : 'already'} resized to ${canvas.width}x${canvas.height}.`);
  gl.viewport(0, 0, canvas.width, canvas.height);
  // enable culling and depth testing
  gl.enable(gl.CULL_FACE | gl.DEPTH_TEST);

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

    return function doRender() {
      // initialize time if haven't
      if (!startTime) {
        previousTime = startTime = performance.now();
      }

      // set time
      {
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

        const unifTime = gl.getUniformLocation(program, "u_Time");
        gl.uniform1f(unifTime, elapsedTime);
      }

      // set positions
      {
        const attrPos = gl.getAttribLocation(program, "a_Pos");
        gl.enableVertexAttribArray(attrPos);
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
        gl.vertexAttribPointer(attrPos, 2, gl.FLOAT, false, 0, 0);
      }

      // set colors
      /* 
      tri0 : 0 -> 1 -> 2 -> 0
      tri1 : 1 -> 2 -> 0 -> 1
      tri2 : 2 -> 0 -> 1 -> 2
      */
      {
        const attrCol = gl.getAttribLocation(program, "a_Col");
        gl.enableVertexAttribArray(attrCol);
        gl.bindBuffer(gl.ARRAY_BUFFER, colBuffer);
        const colors = new Uint8Array([
          allColors[Math.floor(elapsedTime + 0) % 6],
          allColors[Math.floor(elapsedTime + 1) % 6],
          allColors[Math.floor(elapsedTime + 2) % 6],
          allColors[Math.floor(elapsedTime + 3) % 6],
          allColors[Math.floor(elapsedTime + 4) % 6],
          allColors[Math.floor(elapsedTime + 5) % 6],
        ].flat());
        gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(attrCol, 4, gl.UNSIGNED_BYTE, true, 0, 0);
      }

      // set next colors
      {
        const attrColNext = gl.getAttribLocation(program, "a_ColNext");
        gl.enableVertexAttribArray(attrColNext);
        gl.bindBuffer(gl.ARRAY_BUFFER, colNextBuffer);
        const colors = new Uint8Array([
          allColors[Math.floor(elapsedTime + 1) % 6],
          allColors[Math.floor(elapsedTime + 2) % 6],
          allColors[Math.floor(elapsedTime + 3) % 6],
          allColors[Math.floor(elapsedTime + 4) % 6],
          allColors[Math.floor(elapsedTime + 5) % 6],
          allColors[Math.floor(elapsedTime + 0) % 6],
        ].flat());
        gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(attrColNext, 4, gl.UNSIGNED_BYTE, true, 0, 0);
      }

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
