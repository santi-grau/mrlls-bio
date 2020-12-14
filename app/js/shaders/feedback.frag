uniform float time;
uniform sampler2D inScene;
uniform vec2 size;

const float PI = 3.1415926535897932384626433832795;
#pragma glslify: snoise2 = require(glsl-noise/simplex/2d)


void main()	{

    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec4 inp = texture2D( inScene, uv );
    vec4 position = texture2D( texturePosition, uv );
    float n = ( 1.0 + snoise2( vec2( uv.x * 10.10, time * 10.0 ) ) ) * 0.5 ;
    vec4 color = ( inp * clamp( n, 0.0, 0.5 ) + position * 0.991 ) ;

    gl_FragColor = color;
}