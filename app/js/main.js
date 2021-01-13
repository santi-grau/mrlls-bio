import { Scene, WebGLRenderer, Color, OrthographicCamera, Vector2, PlaneBufferGeometry, MeshBasicMaterial, Mesh, WebGLRenderTarget, CustomBlending, AddEquation, OneMinusSrcAlphaFactor, OneFactor } from 'three'
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js'
import SimplexNoise from 'simplex-noise'
import shaderPosition from './feedback.frag'
import chroma from 'chroma-js'
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator'
import seedrandom from 'seedrandom'
import CCapture from 'ccapture.js-npmfixed'
import Plane from './Plane'
import { transcode, importSettings, exportSettings, exportImage } from './Helpers'

class Bars{
    constructor( seed = null ){
        if( window.location.hash ) {
            this.seed = window.location.hash.substring(1)
            document.querySelector( 'input[name=name]').value = this.seed
        } else this.seed = uniqueNamesGenerator( { dictionaries: [adjectives, colors, animals ], separator: '' } )
        this.rng = seedrandom( this.seed )
        this.setFromSeed()
        
        this.timeLimitRecording = 15
        this.frameRateRecording = 60
        this.frameCountRecording = 0
        this.t = 0
        this.node = document.getElementById( 'main' )
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
        Object.values( document.querySelectorAll( '.valueShow' ) ).forEach( e => {
            e.value = e.previousSibling.value
            e.addEventListener( 'input', ( v ) => { 
                e.previousSibling.value = v.target.value 
                this.reset()
            } )
            e.previousSibling.addEventListener( 'input', ( ) => { e.value = e.previousSibling.value } )
        } )
        this.plane = new Mesh( new PlaneBufferGeometry( 1, 1 ), new MeshBasicMaterial({ color : 0xffffff, transparent : true, blending : CustomBlending, blendEquation : AddEquation, blendSrc : OneFactor, blendDst : OneMinusSrcAlphaFactor } ) )
        this.scene.add( this.plane )

        
        this.reset()

        this.bg = new Mesh( new PlaneBufferGeometry( 1, 1 ), new MeshBasicMaterial( { color : 0x111111 } ) )
        this.bg.position.z = -1
        this.scene.add( this.bg )

        this.capturing = false
        this.capturer = new CCapture( {
            format: 'webm',
            framerate: this.frameRateRecording,
            verbose: false,
            quality : 99
        } )

        this.onResize()
        this.step( 0 )
    }

    setFromSeed(){
        var c = chroma({ h: this.rng() * 360 , s : 1, l : 0.5 } )
        document.querySelector( 'input[name=fgcolor]').value = c.hex()
    }

    setRatio( v ){
        const margin = 80
        if( v == 0 ) {
            this.node.style.width = window.innerWidth + 'px'
            this.node.style.height = window.innerHeight + 'px'
            this.node.classList.remove( 'framed' )
        } else {
            var dims = { w : document.querySelector( 'input[name=rWidth]').value, h : document.querySelector( 'input[name=rHeight]').value }
            if( v !== 'custom' ) dims = { w : Math.round( v.split( '_' )[ 0 ] ) , h : Math.round( v.split( '_' )[ 1 ] ) }
            var war = ( window.innerHeight - margin * 2 ) / ( window.innerWidth - margin * 2 )
            var sar = dims.h / dims.w
            if( sar > war ){
                this.node.style.height = window.innerHeight - margin * 2 + 'px'
                this.node.style.width = ( ( window.innerHeight - margin * 2 ) / sar ) + 'px'
            } else {
                this.node.style.width = window.innerWidth - margin * 2 + 'px'
                this.node.style.height = ( ( window.innerWidth - margin * 2 ) * sar ) + 'px'
            }
            this.node.classList.add( 'framed' )
        }
        
        

        this.onResize( )
        this.renderer.setPixelRatio( 1920 / this.node.offsetWidth * 2 )
        this.camera.updateProjectionMatrix()
        this.reset()
    }

    updateCustomRatio(){
        this.setRatio( 'custom' )
        document.querySelector( 'input[value=custom]').checked = true
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

    onDrop( e ){
        e.preventDefault()
        let file = e.dataTransfer.files[ 0 ], reader = new FileReader(), ext = file.name.split( '.' )[ file.name.split( '.' ).length - 1 ]
        if( ext == 'json' ) {
            reader.readAsText( file )
            reader.onloadend = ( e ) => { if( ext == 'json' ) importSettings( JSON.parse( reader.result ) ) }
            bars.reset()
        }
    }

    reset(){
        this.simplex = new SimplexNoise( this.seed )
        var ps = []
        for( var i = 0 ; i < this.computeSize.x * this.computeSize.y ; i++ ) ps.push( 0,0,0,0 )
        this.dtPosition.image.data = new Float32Array( ps )
        this.gpuCompute.init()
        while( this.renderScene.children.length ) this.renderScene.remove( this.renderScene.children[ 0 ] )
        this.t = 0
        this.addPlanes()

        this.renderScene.children.forEach( ( p, i ) => {
            p.scale.y = this.node.offsetHeight / 800
            p.scale.x = this.node.offsetHeight / 800
            p.scale.z = this.node.offsetHeight / 800
        } )
    }

    addPlanes(){
        var ammount = document.querySelector( 'input[name=density]').value
        for( var i = 0 ; i < ammount ; i++ ){
            var p = new Plane( i / ammount )
            p.userData.ride = 0.1 * this.rng()
            if( this.rng() > ( 1 - document.querySelector( 'input[name=continuity]').value ) ) p.userData.ride = 1
            this.renderScene.add( p )
            p.setColor( chroma( document.querySelector( 'input[name=fgcolor]').value ).hsl(), document.querySelector( 'input[name=ramp]').value )
        }
    }

    startVideoExport(){
        if( this.capturing ) return
        this.frameCountRecording = 0
        document.body.classList.add( 'recording' )
        this.capturer.start()
        this.capturing = true
        setTimeout( () => this.stopVideoExport(), ( this.timeLimitRecording * 1000 ) )
    }

    stopVideoExport(){
        this.capturer.stop()
        this.capturer.save( blob => transcode( new File([blob], 'file_name', { lastModified : new Date().getTime() } ) ) )
        this.capturing = false
        console.log('done')
        this.exporting = true
    }
  
    step( time ){
        requestAnimationFrame( ( time ) => this.step( time ) )
        var speed = 0.2
        this.t = this.t + 0.01 * speed

        this.renderScene.children.forEach( ( p, i ) => {
            p.material.uniforms.opacity.value -= ( p.material.uniforms.opacity.value - (document.querySelector( 'input[name=trail]').value/40) * speed * 10 ) * 0.3
            
            var n = this.simplex.noise2D( ( i + this.t * p.userData.ride ) * 0.4, 0 )
            var n2 = this.simplex.noise2D( 0, ( i  + this.t * p.userData.ride ) * 0.2 )
            var n3 = this.simplex.noise2D( 0, -1000 - i - this.t  )

            var s = document.querySelector( 'input[name=scale]').value
            p.scale.y = parseFloat( s ) + parseFloat( 1 - s ) * n3
            
            var n4 = this.simplex.noise2D( -1000 - i - this.t, 0 )
            p.rotation.z = n4 * Math.PI * 0.1 * document.querySelector( 'input[name=rotation]').value
            p.position.x = n * this.node.offsetWidth / 2 * document.querySelector( 'input[name=spreadx]').value
            p.position.y = n2 * this.node.offsetHeight / 2 * document.querySelector( 'input[name=spready]').value

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

        if( this.capturing ) {
            this.capturer.capture( this.renderer.domElement )
            document.body.querySelector( '.perc.capturing' ).style.width = ( ++this.frameCountRecording / ( this.timeLimitRecording * this.frameRateRecording ) * 100 ) + '%'
            
        }
    }
}

var bars = new Bars()

Object.values( document.querySelectorAll( '.triggerReset' ) ).forEach( t => t.addEventListener( 'change', ( e ) => bars.reset() ) )

document.querySelector( 'input[name=bgcolor]').addEventListener( 'input', ( e ) => {
    document.body.style.backgroundColor = e.target.value
    document.body.classList.toggle( 'darkmode', ( chroma( e.target.value ).hsl()[ 2 ] < 0.5 ) )
    var cgl = chroma( e.target.value ).gl()
    if( bars.bg ) bars.bg.material.color = new Color( cgl[ 0 ], cgl[ 1 ], cgl[ 2 ] )
})

Object.values( document.querySelectorAll( 'input[name=op]' ) ).forEach( s => { s.addEventListener( 'input', ( e ) => bars.setRatio( e.target.value ) ) })
document.querySelector( 'input[name=fgcolor]').addEventListener( 'input', ( e ) => { bars.renderScene.children.forEach( p => p.setColor( chroma( e.target.value ).hsl() ) ) } )
document.querySelector( '.downloadBut' ).addEventListener( 'click', ( e ) =>  { 
    exportImage( bars.renderer, bars.scene, bars.camera ) 
    bars.onResize()
} )
document.querySelector( '.exportVideoBut' ).addEventListener( 'click', ( e ) =>  { bars.startVideoExport() } )

document.querySelector( '.resetBut' ).addEventListener( 'click', ( e ) =>  { bars.reset() } )
document.querySelector( '.saveBut' ).addEventListener( 'click', ( e ) =>  { exportSettings() } )
document.querySelector( 'input[name=rWidth]').addEventListener( 'input', ( ) => bars.updateCustomRatio( ) )
document.querySelector( 'input[name=rHeight]').addEventListener( 'input', ( ) => bars.updateCustomRatio( ) )
document.querySelector( 'input[name=name]').addEventListener( 'keydown', e => {
    if (e.keyCode == 13) { 
        window.location = '#' + e.target.value
        location.reload()
    }
}, false)

document.body.addEventListener( 'dragover', ( e ) => e.preventDefault(), false)
document.body.addEventListener('drop', ( e ) => bars.onDrop( e ), false )
document.querySelector( 'input[name=fgcolor]').addEventListener( 'change', ( e ) => bars.reset() )
window.addEventListener( 'resize' , ( ) => bars.onResize() )