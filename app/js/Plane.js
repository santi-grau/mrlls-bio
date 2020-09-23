import { PlaneBufferGeometry, MeshBasicMaterial, Mesh, ShaderMaterial } from 'three'
import SimplexNoise from 'simplex-noise'
import planeShader from './plane.*'

class Plane extends Mesh{
    constructor(){
        super()
        this.geometry = new PlaneBufferGeometry( 0.025, 0.5 )

        this.material = new ShaderMaterial({
            uniforms : {
                time : { value : null },
                opacity : { value : 0.05 },
                hue : { value : 0 }
            },
            vertexShader : planeShader.vert,
            fragmentShader : planeShader.frag,
            transparent : true
        })

        this.simplex = new SimplexNoise(Math.random)
        this.simplex2 = new SimplexNoise(Math.random)
        this.simplex3 = new SimplexNoise(Math.random)
        this.simplex4 = new SimplexNoise(Math.random)
        this.startx = ( Math.random() - 0.5 ) * 2
        this.starty = ( Math.random() - 0.5 ) * 0.2
        this.startr = ( Math.random() - 0.5 ) * 0.01 * Math.PI * 2
        this.position.x = ( Math.random() - 0.5 )
        this.spreadx = 0.1 + Math.random() * 2
        this.spready = 0.1 + Math.random() * 1
        this.rotate = ( Math.random( ) > 0.95 )
        console.log( this.rotate )
    }

    randomize(){
        this.startx = ( Math.random() - 0.5 ) * 2
        this.starty = ( Math.random() - 0.5 ) * 0.2
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
        
        
        // this.material.uniforms.opacity.value = 0.02 + 0.99 * value2d3

        this.material.uniforms.time.value = time
    }
}

export { Plane as default }