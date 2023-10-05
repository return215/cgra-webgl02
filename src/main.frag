precision mediump float;

varying vec4 v_Col;
varying vec4 v_ColNext;
uniform float u_Time;

void main(){
    float time = mod(u_Time, 1.0); // u_Time % 1.0
    vec4 mixedColors = mix(v_Col, v_ColNext, time);
    gl_FragColor = mixedColors;
}
