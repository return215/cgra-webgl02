attribute vec4 a_Pos;
attribute vec4 a_Col;
attribute vec4 a_ColNext;

varying vec4 v_Col;

uniform float u_Time;

void main(){
    // TODO implement scaling

    float time = mod(u_Time, 1.0); // u_Time % 1.0
    gl_Position = a_Pos;
    vec4 mixedColors = mix(a_Col, a_ColNext, time);
    v_Col = mixedColors;
}