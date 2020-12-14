import { Scene, WebGLRenderer, OrthographicCamera, Vector2, PlaneBufferGeometry, MeshBasicMaterial, Mesh, WebGLRenderTarget, PerspectiveCamera, ShaderMaterial } from 'three'
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js'
import shaderPosition from './shaders/feedback.frag'
const AColorPicker = require('a-color-picker')
import Plane from './Plane'
import outFS from './shaders/out.frag'
import baseVS from './shaders/base.vert'
import { uniqueNamesGenerator, Config, adjectives, colors, animals } from 'unique-names-generator'
import seedrandom from 'seedrandom'

class Bars{
    constructor( seed = null ){
        this.node = document.getElementById( 'main' )

        if( window.location.hash ) this.seed = window.location.hash.substring(1)
        else this.seed = uniqueNamesGenerator( { dictionaries: [adjectives, colors, animals ], separator: '' } )
        console.log( this.seed )
        this.camera = new OrthographicCamera( )
        this.scene = new Scene()
        this.renderer = new WebGLRenderer( { antialias : true, alpha : true } )
        this.node.appendChild( this.renderer.domElement )
        
        this.rng = seedrandom( this.seed )
        document.querySelector( 'input[name=hue]').value = this.rng()
        document.querySelector( 'input[name=density]').value = 8 + Math.round( this.rng() * 8 )

        AColorPicker.from('.picker').on('change', (picker, color) => { document.body.style.backgroundColor = color; });

        this.renderScene = new Scene()
        this.renderCam = new PerspectiveCamera()
        this.renderTarget = new WebGLRenderTarget( this.node.offsetWidth * 2, this.node.offsetHeight * 2, {  } )

        for( var i = 0 ; i < 32 ; i++ ) this.renderScene.add( new Plane( this.seed + i ) )
       
        this.computeSize = new Vector2( this.node.offsetWidth, this.node.offsetHeight )
        this.gpuCompute = new GPUComputationRenderer( this.computeSize.x, this.computeSize.y, this.renderer )
        
        this.dtPosition = this.gpuCompute.createTexture()
        var ps = []

        for( var i = 0 ; i < this.computeSize.x * this.computeSize.y ; i++ ) ps.push( 0,0,0,0 )

        this.positionVariable = this.gpuCompute.addVariable( 'texturePosition', shaderPosition, this.dtPosition )
            
        this.gpuCompute.setVariableDependencies( this.positionVariable, [ this.positionVariable ] )
        this.positionUniforms = this.positionVariable.material.uniforms

        this.positionUniforms[ 'time' ] = { value: 0.0 }
        this.positionUniforms[ 'inScene' ] = { value: null }
        this.positionUniforms[ 'size' ] = { value: new Vector2( this.computeSize.x, this.computeSize.y ) }

        this.gpuCompute.init()
                                
        var pm = new ShaderMaterial({
            uniforms : {
                outt : { value : this.dtPosition },
                hue : { value : 0 },
                saturation : { value : 0 },
                divergence : { value : 0 }
            },
            vertexShader : baseVS,
            fragmentShader : outFS,
            transparent : true
        })
        this.plane = new Mesh( new PlaneBufferGeometry( 1, 1 ), pm )
        this.scene.add( this.plane )

        var rand = setInterval( () => this.randomize(), 5000 )
        this.setDensity( document.querySelector( 'input[name=density]').value )
        this.setHue( document.querySelector( 'input[name=hue]').value )

        this.setSaturation( document.querySelector( 'input[name=saturation]').value )
        this.setDivergence( document.querySelector( 'input[name=divergence]').value )
        this.onResize()
        this.step( 0 )
    }

    randomize(){
        this.renderScene.children.forEach( p => { if( Math.random() > 0.8 ) p.randomize( ) } )
    }

    setDensity( e ){
        this.renderScene.children.forEach( ( p, i ) => {
            if( i < e ){ p.visible = true } 
            else { p.visible = false }
        })
    }

    setSpread( e ){
        this.renderScene.children.forEach( ( p, i ) => {
            p.spready = e
        })
    }

    setHue( e ){
        this.plane.material.uniforms.hue.value = e
    }

    setSaturation( e ){
        this.plane.material.uniforms.saturation.value = e
    }

    setDivergence( e ){
        this.plane.material.uniforms.divergence.value = e
    }

    exportImage(){
        document.querySelector( 'input[name=playing]').checked = false
        
        
        this.renderer.setPixelRatio( 4 )
        this.renderer.render( this.scene, this.camera )

        var a = document.createElement( 'a' )
        a.href = this.renderer.domElement.toDataURL().replace( 'image/png', 'image/octet-stream' )
        a.download = 'export.png'
        a.click()

        this.onResize()
    }

    onResize( ) {
        var [ width, height ] = [ this.node.offsetWidth, this.node.offsetHeight ]
        this.renderer.setSize( width, height )
		this.renderer.setPixelRatio( window.devicePixelRatio )
        var camView = { left :  width / -2, right : width / 2, top : height / 2, bottom : height / -2 }
        for ( var prop in camView ) this.camera[ prop ] = camView[ prop ]
        this.camera.position.z = 150
        this.camera.updateProjectionMatrix()

        var camView2 = { fov : 35, aspect : width / height, near : 0.001, far : 1000 }
        for ( var prop in camView2 ) this.renderCam[ prop ] = camView2[ prop ]
        this.renderCam.position.set( 0, 0, 3 )
        this.renderCam.updateProjectionMatrix()

        this.plane.scale.set( width, height, 1 )
    }
  
    step( time ){
        requestAnimationFrame( ( time ) => this.step( time ) )
        if( document.querySelector( 'input[name=playing]').checked ){
        
            this.renderScene.children.forEach( p => p.step( time ) )

            this.positionUniforms[ 'time' ].value += 0.001
            this.renderer.setRenderTarget( this.renderTarget )
            this.renderer.render( this.renderScene, this.renderCam )

            this.positionUniforms[ 'inScene' ].value = this.renderTarget.texture

            this.gpuCompute.compute()
            this.plane.material.uniforms.outt.value = this.gpuCompute.getCurrentRenderTarget( this.positionVariable ).texture

            this.renderer.setRenderTarget( null )

        }
        this.renderer.render( this.scene, this.camera )
    }
}


var bars = new Bars( )

document.querySelector( 'input[name=density]').addEventListener( 'input', ( e ) => bars.setDensity( e.target.value ) )
document.querySelector( 'input[name=hue]').addEventListener( 'input', ( e ) => bars.setHue( e.target.value) )
document.querySelector( 'input[name=spready]').addEventListener( 'input', ( e ) => bars.setSpread( e.target.value) )
document.querySelector( 'input[name=saturation]').addEventListener( 'input', ( e ) => bars.setSaturation( e.target.value) )
document.querySelector( 'input[name=divergence]').addEventListener( 'input', ( e ) => bars.setDivergence( e.target.value) )
document.querySelector( 'input[name=bgcolor]').addEventListener( 'input', ( e ) => document.body.style.backgroundColor = e.target.value )
document.querySelector( '.exportPNG').addEventListener( 'click', ( e ) => bars.exportImage() )

document.querySelector( 'input[name=name]').addEventListener( 'keydown', e => {
    if (e.keyCode == 13) { 
        window.location = '#' + e.target.value
        location.reload()
    }
}, false)