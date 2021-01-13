import { Scene, WebGLRenderer, Color, OrthographicCamera, Vector2, PlaneBufferGeometry, MeshBasicMaterial, Mesh, WebGLRenderTarget, CustomBlending, AddEquation, OneMinusSrcAlphaFactor, OneFactor, MeshPhysicalMaterial } from 'three'
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js'
import SimplexNoise from 'simplex-noise'
import shaderPosition from './feedback.frag'
import chroma from 'chroma-js'
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator'
import seedrandom from 'seedrandom'
import Plane from './Plane'
import settings from './settings.json'

class Bars{
    constructor( node = null, options = settings ){
        this.density = options.density || settings.density.value
        this.spreadx = options.spreadx || settings.spreadx.value
        this.spready = options.spready || settings.spready.value
        this.rotation = options.rotation || settings.rotation.value
        this.scale = options.scale || settings.scale.value
        this.continuity = options.continuity || settings.continuity.value
        this.trail = options.trail || settings.trail.value
        this.bgcolor = options.bgcolor || settings.bgcolor.value
        
        this.ramp = options.ramp || settings.ramp.value
        this.seed = options.seed || uniqueNamesGenerator( { dictionaries: [adjectives, colors, animals ], separator: '' } )
        
        this.rng = seedrandom( this.seed )
        var c = chroma({ h: this.rng() * 360 , s : 1, l : 0.5 } )
        this.fgcolor = options.fgcolor || c.hex()
        
        this.t = 0
        this.node = node
        this.camera = new OrthographicCamera( )
        this.scene = new Scene()
        
        this.renderer = new WebGLRenderer( { antialias : true, alpha : true, preserveDrawingBuffer : true } )
        this.node.appendChild( this.renderer.domElement )
        
        this.renderScene = new Scene()
        this.renderCam = new OrthographicCamera()
        this.renderTarget = new WebGLRenderTarget( this.node.offsetWidth, this.node.offsetHeight, {  } )
       
        this.computeSize = new Vector2( this.node.offsetWidth * 2, this.node.offsetHeight * 2 )
        this.gpuCompute = new GPUComputationRenderer( this.computeSize.x, this.computeSize.y, this.renderer )
        this.dtPosition = this.gpuCompute.createTexture()      
        this.positionVariable = this.gpuCompute.addVariable( 'texturePosition', shaderPosition, this.dtPosition )
        this.gpuCompute.setVariableDependencies( this.positionVariable, [ this.positionVariable ] )
        this.positionUniforms = this.positionVariable.material.uniforms
        
        this.plane = new Mesh( new PlaneBufferGeometry( 1, 1 ), new MeshBasicMaterial({ color : 0xffffff, transparent : true, blending : CustomBlending, blendEquation : AddEquation, blendSrc : OneFactor, blendDst : OneMinusSrcAlphaFactor } ) )
        this.scene.add( this.plane )

        this.bg = new Mesh( new PlaneBufferGeometry( 1, 1 ), new MeshBasicMaterial( { color : new Color( this.bgcolor ) } ) )
        this.bg.position.z = -1
        this.scene.add( this.bg )

        this.simplex = new SimplexNoise( this.seed )
        var ps = []
        for( var i = 0 ; i < this.computeSize.x * this.computeSize.y ; i++ ) ps.push( 0,0,0,0 )
        this.dtPosition.image.data = new Float32Array( ps )
        this.gpuCompute.init()
        while( this.renderScene.children.length ) this.renderScene.remove( this.renderScene.children[ 0 ] )
        
        this.addPlanes()

        this.renderScene.children.forEach( ( p, i ) => p.scale.set( this.node.offsetHeight / 800, this.node.offsetHeight / 800, this.node.offsetHeight / 800 ) )

        this.onResize()
        this.step( 0 )
    }

    onResize( ) {
        var [ width, height ] = [ this.node.offsetWidth, this.node.offsetHeight ]
        this.renderer.setSize( width, height )
        this.renderer.setPixelRatio( 1 )
        var camView = { left :  width / -2, right : width / 2, top : height / 2, bottom : height / -2 }
        for ( var prop in camView ) this.camera[ prop ] = camView[ prop ]
        this.camera.position.z = 150
        this.camera.updateProjectionMatrix()
        for ( var prop in camView ) this.renderCam[ prop ] = camView[ prop ]
        this.renderCam.position.z = 150
        this.renderCam.updateProjectionMatrix()
        this.plane.scale.set( width, height, 1 )
        if( this.bg ) this.bg.scale.set( width, height, 1 )
    }

    addPlanes(){
        var ammount = this.density
        for( var i = 0 ; i < ammount ; i++ ){
            var p = new Plane( i / ammount )
            p.userData.ride = 0.1 * this.rng()
            if( this.rng() > ( 1 - this.continuity ) ) p.userData.ride = 1
            this.renderScene.add( p )
            p.setColor( chroma( this.fgcolor ).hsl(), this.ramp )
        }
    }
  
    step( time ){
        requestAnimationFrame( ( time ) => this.step( time ) )
        var speed = 0.2
        this.t = this.t + 0.01 * speed

        this.renderScene.children.forEach( ( p, i ) => {
            p.material.uniforms.opacity.value -= ( p.material.uniforms.opacity.value - ( this.trail / 40 ) * speed * 10 ) * 0.3
            
            var n = this.simplex.noise2D( ( i + this.t * p.userData.ride ) * 0.4, 0 )
            var n2 = this.simplex.noise2D( 0, ( i  + this.t * p.userData.ride ) * 0.2 )
            var n3 = this.simplex.noise2D( 0, -1000 - i - this.t  )

            var s = this.scale
            p.scale.y = parseFloat( s ) + parseFloat( 1 - s ) * n3
            
            var n4 = this.simplex.noise2D( -1000 - i - this.t, 0 )
            p.rotation.z = n4 * Math.PI * 0.1 * this.rotation
            p.position.x = n * this.node.offsetWidth / 2 * this.spreadx
            p.position.y = n2 * this.node.offsetHeight / 2 * this.spready

            p.step( time )
        } )

        this.positionUniforms[ 'time' ] = { value: time }
        this.renderer.setRenderTarget( this.renderTarget )
        this.renderer.render( this.renderScene, this.renderCam )
        this.positionUniforms[ 'inScene' ] = { value: this.renderTarget.texture }
        this.gpuCompute.compute()
        this.plane.material.map = this.gpuCompute.getCurrentRenderTarget( this.positionVariable ).texture
        this.renderer.setRenderTarget( null )
        var nr = this.simplex.noise2D( this.t * 0.01, 1000 )
        this.renderCam.rotation.z = nr * Math.PI * 0.1
        this.renderer.render( this.scene, this.camera )
    }
}

Object.values( document.querySelectorAll( '.bioplayer' ) ).forEach( p => new Bars( p, p.dataset ) )