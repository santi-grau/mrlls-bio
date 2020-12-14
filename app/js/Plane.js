import { PlaneBufferGeometry, MeshBasicMaterial, Mesh, ShaderMaterial } from 'three'
import SimplexNoise from 'simplex-noise'
import planeFS from './shaders/plane.frag'
import baseVS from './shaders/base.vert'

import seedrandom from 'seedrandom'

class Plane extends Mesh{
    constructor( seed ){
        super()

        this.rng = seedrandom( seed )

        this.geometry = new PlaneBufferGeometry( 0.025, 0.5 )
        
        this.material = new ShaderMaterial({
            uniforms : {
                time : { value : null },
                opacity : { value : 0.05 },
                hue : { value : 0 }
            },
            vertexShader : baseVS,
            fragmentShader : planeFS,
            transparent : true
        })

        this.simplex = new SimplexNoise(seed)
        this.simplex2 = new SimplexNoise(seed)
        this.simplex3 = new SimplexNoise(seed)
        this.simplex4 = new SimplexNoise(seed)
        this.startx = ( this.rng() - 0.5 ) * 2
        this.starty = ( this.rng() - 0.5 ) * 0.2
        this.startr = ( this.rng() - 0.5 ) * 0.01 * Math.PI * 2
        this.position.x = ( this.rng() - 0.5 )
        this.spreadx = 0.1 + this.rng() * 2
        this.spready = 0.1 + this.rng() * 1
        this.rotate = ( this.rng() > 0.95 )
        // this.material.uniforms.opacity.value = 1

    }

    randomize(){
        
        this.startx = ( this.rng() - 0.5 ) * 2
        this.starty = ( this.rng() - 0.5 ) * 0.2

        this.material.uniforms.opacity.value = 1
    }

    step( time ){

        var value2d = this.simplex.noise2D( 0, time * 0.0001 ) * 0.3
        this.position.x = this.startx + value2d * this.spreadx
        var value2d2 = this.simplex2.noise2D( 0, time * 0.0001 ) * 0.3
        
        this.position.y = this.starty + value2d2 * this.spready
        

        var value2d3 = this.simplex3.noise2D( 0, time * 0.0001 ) * 0.1
        this.rotation.z = this.startr
        if( this.rotate ) this.rotation.z = this.startr + value2d3 * Math.PI * 2

        var value2d4 = this.simplex3.noise2D( 0, time * 0.0001 ) * 0.6
        this.scale.y = 0.7 + 0.3 * value2d4
        
        
        this.material.uniforms.opacity.value -= ( this.material.uniforms.opacity.value - 0.05 ) * 0.3

        this.material.uniforms.time.value = time
    }
}

export { Plane as default }