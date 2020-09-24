uniform sampler2D outt;
varying vec2 vUv;
uniform float hue;
uniform float saturation;
uniform float divergence;
#pragma glslify: hsl2rgb = require(glsl-hsl2rgb) 
void main()	{
    vec4 o = texture2D( outt, vUv );
    vec3 ccc = hsl2rgb( o.b * divergence + hue, saturation, 1.0 - saturation * 0.5 );
    gl_FragColor = vec4( ccc, o.w );
}