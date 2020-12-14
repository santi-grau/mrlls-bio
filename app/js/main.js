import { Scene, WebGLRenderer, Color, OrthographicCamera, RGBAFormat, Vector2, PlaneBufferGeometry, MeshBasicMaterial, BoxBufferGeometry, MeshNormalMaterial, Mesh, WebGLRenderTarget, PerspectiveCamera, ShaderMaterial, DataTexture } from 'three'
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js'
import SimplexNoise from 'simplex-noise'
import shaderPosition from './feedback.frag'
import Plane from './Plane'
import chroma from 'chroma-js'
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator'
import seedrandom from 'seedrandom'

class Bars{
    constructor( seed = null ){
        if( window.location.hash ) {
            this.seed = window.location.hash.substring(1)
            document.querySelector( 'input[name=name]').value = this.seed
        } else this.seed = uniqueNamesGenerator( { dictionaries: [adjectives, colors, animals ], separator: '' } )
        this.rng = seedrandom( this.seed )
        this.setFromSeed()

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
                                
        this.plane = new Mesh( new PlaneBufferGeometry( 1, 1 ), new MeshBasicMaterial({ color : 0xffffff }) )
        this.scene.add( this.plane )

        document.body.addEventListener( 'dragover', ( e ) => e.preventDefault(), false)
        document.body.addEventListener('drop', ( e ) => this.onDrop( e ), false )

        this.reset()

        this.onResize()
        this.step( 0 )
    }

    setFromSeed(){
        var c = chroma({ h: this.rng() * 360 , s : 1, l : 0.5 } )
        document.querySelector( 'input[name=fgcolor]').value = c.hex()
    }

    onResize( ) {
        var [ width, height ] = [ this.node.offsetWidth, this.node.offsetHeight ]
        this.renderer.setSize( width, height )
        this.renderer.setPixelRatio( window.devicePixelRatio )
        var camView = { left :  width / -2, right : width / 2, top : height / 2, bottom : height / -2 }
        for ( var prop in camView ) this.camera[ prop ] = camView[ prop ]
        
        this.camera.position.z = 150
        this.camera.updateProjectionMatrix()

        for ( var prop in camView ) this.renderCam[ prop ] = camView[ prop ]
        this.renderCam.position.z = 150
        this.renderCam.updateProjectionMatrix()

        this.plane.scale.set( width, height, 1 )
    }

    onDrop( e ){
        e.preventDefault()
        let file = e.dataTransfer.files[ 0 ]
        let reader = new FileReader()
        var ext = file.name.split( '.' )[ file.name.split( '.' ).length - 1 ]
        if( ext == 'json' ) reader.readAsText( file )
        else return

        reader.onloadend = ( e ) => { if( ext == 'json' ) this.importSettings( JSON.parse( reader.result ) ) }
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
    }

    addPlanes(){
        var ammount = document.querySelector( 'input[name=density]').value
        for( var i = 0 ; i < ammount ; i++ ){
            var p = new Plane( i / ammount )
            p.userData.ride = 0.1 * this.rng()
            if( this.rng() > ( 1 - document.querySelector( 'input[name=continuity]').value ) ) p.userData.ride = 1
            this.renderScene.add( p )
            p.setColor( chroma( document.querySelector( 'input[name=fgcolor]').value ).hsl() )
        }
    }

    exportImage(){
        this.renderer.setPixelRatio( 4 )
        this.renderer.render( this.scene, this.camera )
        var a = document.createElement( 'a' )
        a.href = this.renderer.domElement.toDataURL().replace( 'image/png', 'image/octet-stream' )
        a.download = uniqueNamesGenerator( { dictionaries: [adjectives, adjectives ], separator: '-' } ) + '.png'
        a.click()
        this.onResize()
    }

    exportSettings(){
        var data = {}
        Object.values( document.querySelectorAll( '.exportable' ) ).forEach( s => data[ s.getAttribute( 'name' ) ] = s.value )
        var element = document.createElement('a')
        element.setAttribute( 'href', 'data:text/plain;charset=utf-8,' + encodeURIComponent( JSON.stringify( data ) ) )
        element.setAttribute( 'download', 'biosystem-settings.json' )
        element.click()
    }

    importSettings( d ){
        Object.keys( d ).forEach( s => document.querySelector( 'input[name=' + s + ']').value = d[s] )
        bars.reset()
    }
  
    step( time ){
        requestAnimationFrame( ( time ) => this.step( time ) )
        var speed = 0.2
        this.t = this.t + 0.01 * speed

        this.renderScene.children.forEach( ( p, i ) => {
            p.material.uniforms.opacity.value -= ( p.material.uniforms.opacity.value - document.querySelector( 'input[name=trail]').value * speed * 10 ) * 0.3
            
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
    }
}

var bars = new Bars()


Object.values( document.querySelectorAll( '.triggerReset' ) ).forEach( t => t.addEventListener( 'change', ( e ) => bars.reset() ) )

document.querySelector( 'input[name=bgcolor]').addEventListener( 'input', ( e ) => {
    document.body.style.backgroundColor = e.target.value
    document.body.classList.toggle( 'darkmode', ( chroma( e.target.value ).hsl()[ 2 ] < 0.5 ) )
    var cgl = chroma( e.target.value ).gl()
    bars.scene.background = new Color( cgl[ 0 ], cgl[ 1 ], cgl[ 2 ] )
})

document.querySelector( 'input[name=fgcolor]').addEventListener( 'input', ( e ) => {
    bars.renderScene.children.forEach( p => p.setColor( chroma( e.target.value ).hsl() ) )
})

document.querySelector( '.downloadBut' ).addEventListener( 'click', ( e ) =>  {
    bars.exportImage()
})

document.querySelector( '.saveBut' ).addEventListener( 'click', ( e ) =>  {
    bars.exportSettings()
})

document.querySelector( 'input[name=name]').addEventListener( 'keydown', e => {
    if (e.keyCode == 13) { 
        window.location = '#' + e.target.value
        location.reload()
    }
}, false)