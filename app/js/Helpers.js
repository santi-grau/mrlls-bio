import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg'
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator'

const transcode = async ( file ) => {
    const ffmpeg = createFFmpeg( { log: false } )
    ffmpeg.setProgress( ( { ratio } ) => document.body.querySelector( '.perc.encoding' ).style.width = ( ratio * 100 ) + '%' )
    await ffmpeg.load()
    const { name } = file
    ffmpeg.FS('writeFile', name, await fetchFile( file ) )
    await ffmpeg.run( '-i', name, '-s', '1920x1080', '-crf', '5', 'output.mp4' )
    document.body.classList.remove( 'recording' )

    const data = ffmpeg.FS('readFile', 'output.mp4')
    const blobUrl = URL.createObjectURL( new Blob( [ data.buffer ], { type: 'video/mp4' } ) )
    const link = document.createElement( 'a' )
    link.href = blobUrl
    link.download = uniqueNamesGenerator( { dictionaries: [adjectives, adjectives ], separator: '-' } ) + '.mp4'
    document.body.appendChild( link )
    link.dispatchEvent( new MouseEvent('click', { bubbles: true, cancelable: true, view: window } ) )
    document.body.removeChild( link )
}

const exportSettings = () => {
    var data = {}
    Object.values( document.querySelectorAll( '.exportable' ) ).forEach( s => data[ s.getAttribute( 'name' ) ] = s.value )
    var element = document.createElement('a')
    element.setAttribute( 'href', 'data:text/plain;charset=utf-8,' + encodeURIComponent( JSON.stringify( data ) ) )
    element.setAttribute( 'download', 'biosystem-settings.json' )
    element.click()
}

const importSettings = ( d ) => {
    Object.keys( d ).forEach( s => document.querySelector( 'input[name=' + s + ']').value = d[s] )
}

const exportImage = ( renderer, scene, camera ) => {
    renderer.setPixelRatio( 4 )
    renderer.render( scene, camera )
    var a = document.createElement( 'a' )
    a.href = renderer.domElement.toDataURL().replace( 'image/png', 'image/octet-stream' )
    a.download = uniqueNamesGenerator( { dictionaries: [adjectives, adjectives ], separator: '-' } ) + '.png'
    a.click()
}

export { transcode, importSettings, exportSettings, exportImage }