uniform float time;
uniform float opacity;
varying vec2 vUv;
#pragma glslify: snoise2 = require(glsl-noise/simplex/2d)
#pragma glslify: snoise3 = require(glsl-noise/simplex/3d)
#pragma glslify: hsl2rgb = require(glsl-hsl2rgb) 

void main()	{
    float n = ( 1.0 + snoise3( vec3( vUv.x, vUv.y * 400.0, time ) ) ) * 0.5 ;
    float n2 = ( 1.0 + snoise2( vec2( 1000.0, time * 400.0 ) ) ) * 0.5 ;
    gl_FragColor = vec4( vec3( 0.0, 0.0, n2 ), opacity * n );
}