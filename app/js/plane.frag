uniform float time;
uniform float opacity;
uniform float seed;
uniform vec3 cin;

varying vec2 vUv;
#pragma glslify: snoise3 = require(glsl-noise/simplex/3d)
#pragma glslify: hsl2rgb = require(glsl-hsl2rgb) 

void main()	{
    float n = ( 1.0 + snoise3( vec3( vUv.x * 1000.0, vUv.y * 1000.0, time ) ) ) * 0.5 ;
    gl_FragColor = vec4( hsl2rgb( cin.x, cin.y, cin.z ), opacity * n );
}