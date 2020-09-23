uniform sampler2D outt;
varying vec2 vUv;
uniform float hue;
uniform float divergence;
#pragma glslify: hsl2rgb = require(glsl-hsl2rgb) 
void main()	{
    vec4 o = texture2D( outt, vUv );
    vec3 c1 = vec3( 1.0, 0.0, 0.0 );
    vec3 c2 = vec3( 0.8, 0.0, 0.5 );
    vec3 ccc = hsl2rgb( o.b * divergence + hue, 0.85, 0.5 );
    vec3 cout = mix( c1, c2, o.b );
    gl_FragColor = vec4( ccc, o.w );
}