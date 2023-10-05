precision mediump float;

attribute vec4 a_Pos;
attribute vec4 a_Col;
attribute vec4 a_ColNext;

varying vec4 v_Col;

uniform float u_Time;
uniform mat4 u_ViewProj;
uniform mat4 u_Transform;

void main(){
    gl_Position = u_ViewProj * a_Pos;

    float time = mod(u_Time, 1.0); // u_Time % 1.0
    vec4 mixedColors = mix(a_Col, a_ColNext, time);
    v_Col = mixedColors;
}