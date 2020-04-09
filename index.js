const kVertexShaderSrc = `
precision mediump float;
attribute vec3 pos;
uniform mat4 matrix;
 
void main(void) {
  gl_Position = matrix * vec4(pos, 1.0);
}`;

const kFragmentShaderSrc = `
precision mediump float;
uniform vec4 color;

void main(void) {
  gl_FragColor = color;
}`;

const prepareGL = () => {
  const canvas = document.getElementById('screen');
  const gl = canvas.getContext('webgl');
  const vertices = [];
  const indices = [];
  vertices.push(0.0, 0.0, 0.0);
  indices.push(0);
  for(let i = 0; i <= 360; ++i) {
    vertices.push(Math.cos(i * Math.PI / 180.0), Math.sin(i * Math.PI / 180.0), 0.0);
    indices.push(i+1);
  }

  var vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  var indexBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, kVertexShaderSrc);
  gl.compileShader(vertexShader);

  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, kFragmentShaderSrc); 
  gl.compileShader(fragmentShader);

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  
  const colorLoc = gl.getUniformLocation(program, 'color');
  /**
   * 
   * @param {number} r 
   * @param {number} g 
   * @param {number} b 
   * @param {number} a 
   */
  const setColor = (r,g,b,a) => {
    gl.uniform4fv(colorLoc, [r,g,b,a]);
  };
  const mat4 = glMatrix.mat4;
  const vec4 = glMatrix.vec4;

  const mat = mat4.create();

  const projMat = mat4.create();
  const eyeMat = mat4.create();
  const rotMat = mat4.identity(mat4.create());

  mat4.perspective(projMat, 45, 1, 3, 10);
  mat4.lookAt(eyeMat, [0, 0, 4], [0, 0, 0], [0, 1, 0]);
  const matrixLoc = gl.getUniformLocation(program, 'matrix');
  /**
   * 
   * @param {number} angle 
   */
  const setAngle = (angle) => {
    mat4.identity(rotMat);
    mat4.rotate(rotMat, rotMat, angle / 180 * Math.PI, [1, 1, 1]);
    mat4.identity(mat);
    mat4.mul(mat, mat, projMat);
    mat4.mul(mat, mat, eyeMat);
    mat4.mul(mat, mat, rotMat);
    gl.uniformMatrix4fv(matrixLoc, false, mat);
  };
  setAngle(0);
  setColor(1, 0, 0, 1);
  /**
   * 
   * @param {number} x 
   * @param {number} y 
   */
  const setMousePosition = (x, y) => {
    const tmpMat = mat4.create();
    const tmpVec = vec4.create();
    mat4.set(tmpMat,
      mat[0], mat[1], mat[2], mat[3],
      mat[4], mat[5], mat[6], mat[7],
      0,      0,      -1,     0,
      -x,     -y,     0,      -1
    );
    vec4.set(tmpVec, -mat[12], -mat[13], -mat[14], -mat[15]);
    mat4.invert(tmpMat, tmpMat);
    vec4.transformMat4(tmpVec, tmpVec, tmpMat); /* = (X,Y,wz,w) */
    const mx = tmpVec[0];
    const my = tmpVec[1];
    const dist = Math.hypot(mx, my);
    if(dist < 1) {
      setColor(1,0,0,1);
    } else {
      setColor(1,1,1,1);
    }
  };
  const posLoc = gl.getAttribLocation(program, 'pos');
  gl.bindAttribLocation(program, posLoc, 'pos');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0); 

  return [canvas, gl, indices.length, setMousePosition, setAngle];
};

const main = () => {
  /**
   * @callback MousePositionSetter
   * @param {number} x
   * @param {number} y
   */
  /**
   * @callback AngleSetter
   * @param {number} angle
   */
  /**
   * @type {[HTMLCanvasElement, WebGLRenderingContext, number, MousePositionSetter, AngleSetter]}
   */
  const [canvas, gl, numIndices, setMousePosition, setAngle] = prepareGL();

  let mouseX = NaN;
  let mouseY = NaN;

  canvas.addEventListener('mousemove', (ev) => {
    ev.preventDefault();
    const rect = ev.target.getBoundingClientRect();
    const hw = canvas.width/2;
    const hh = canvas.height/2;
    mouseX = (ev.clientX - rect.left - hw) / hw;
    // OpenGLは座標系がブラウザとは上下が逆転しているのでマイナスをつける
    mouseY = -(ev.clientY - rect.top - hh) / hh;
  } ,false);

  const render = () => {
    setAngle(performance.now() / 20);
    //setAngle(60);
    setMousePosition(mouseX, mouseY);
    // Clear the canvas
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.drawElements(gl.TRIANGLE_FAN, numIndices, gl.UNSIGNED_SHORT,0);
    window.requestAnimationFrame(render);
  };
  window.requestAnimationFrame(render);
};

document.addEventListener('DOMContentLoaded', main);