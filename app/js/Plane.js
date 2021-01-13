import { PlaneBufferGeometry, Mesh, ShaderMaterial, Vector3 } from 'three'
import planeShader from './plane.*'

class Plane extends Mesh{
    constructor( index ){
        super()
        this.index = index
        this.geometry = new PlaneBufferGeometry( 10, 350 )

        this.material = new ShaderMaterial({
            uniforms : {
                time : { value : null },
                opacity : { value : 0.5 },
                cin : { value : new Vector3( 0, 0, 1 ) },
                seed : { value : index * 0.05 },
                ramp : { value : 0 }
            },
            vertexShader : planeShader.vert,
            fragmentShader : planeShader.frag,
            transparent : true
        })
    }

    setColor( c, ramp ){
        this.material.uniforms.cin.value = new Vector3( c[ 0 ] / 360 + ramp * this.index, c[ 1 ], c[ 2 ] )
    }

    step( time ){
        this.material.uniforms.time.value = time
    }
}

export { Plane as default }