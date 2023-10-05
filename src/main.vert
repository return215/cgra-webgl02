precision mediump float;

attribute vec3 a_Pos;
attribute vec4 a_Col;
attribute vec4 a_ColNext;

varying vec4 v_Col;
varying vec4 v_ColNext;

uniform mat4 u_ViewProj;
uniform mat4 u_Transform;

void main(){
    gl_Position = u_ViewProj * vec4(a_Pos, 1.0);

    v_Col = a_Col;
    v_ColNext = a_ColNext;
}
