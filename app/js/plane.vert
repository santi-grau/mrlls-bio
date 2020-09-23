varying vec2 vUv;

void main() {
    vec3 p = position;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( p, 1.0 );
}
