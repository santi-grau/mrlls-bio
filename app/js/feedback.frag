uniform float time;
uniform sampler2D inScene;

const float PI = 3.1415926535897932384626433832795;
#pragma glslify: snoise2 = require(glsl-noise/simplex/2d)


void main()	{

    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec4 inp = texture2D( inScene, uv );
    vec4 position = texture2D( texturePosition, uv );
    float n = ( 1.0 + snoise2( vec2( uv.x * 0.10, time * 1.0 ) ) ) * 0.5 ;
    vec4 color = ( inp * smoothstep( 0.0, 0.95, n ) + position * 0.997 ) ;
    

    gl_FragColor = color;
}