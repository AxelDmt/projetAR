import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import {
  GLTFLoader
} from 'three/addons/loaders/GLTFLoader.js';
import TWEEN from '@tweenjs/tween.js';

let camera, scene, renderer;
let controller;
let reticle;

let hitTestSource = null;
let hitTestSourceRequested = false;

const mixers = [];

init();
animate();

function init() {

  const container = document.createElement( 'div' );
  document.body.appendChild( container );

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 20 );

  const light = new THREE.HemisphereLight( 0xffffff, 0xbbbbff, 3 );
  light.position.set( 0.5, 1, 0.25 );
  scene.add( light );

  //

  renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.xr.enabled = true;
  container.appendChild( renderer.domElement );

  //

  document.body.appendChild( ARButton.createButton( renderer ) );

  //
  let astro;
  const loader = new GLTFLoader();
  let model;
  loader.setPath('assets/')
        .load('Astronaut.glb', function ( gltf ) {
          model = gltf;
          astro = gltf.scene;

          const s = 0.1;
          astro.scale.set( s, s, s );
       
          astro.castShadow = true;
          astro.receiveShadow = true;

          scene.add( astro );

          const mixer = new THREE.AnimationMixer( astro );
          mixer.clipAction( model.animations[ 4 ] ).setDuration( 5 ).play();
          mixers.push( mixer );

        } );

  function onSelect() {
    if ( reticle.visible && astro ) {
      let targetpos = new THREE.Vector3(); 
      mixers[0].clipAction( model.animations[ 4 ] ).stop();
      mixers[0].clipAction( model.animations[ 11 ] ).setDuration( 2 ).play();
      reticle.matrix.decompose( targetpos, astro.quaternion, astro.scale );
      astro.scale.set(0.1,0.1,0.1);
      astro.lookAt(targetpos);
      new TWEEN.Tween(astro.position)
        .to({ x: targetpos.x , y: targetpos.y, z: targetpos.z }, 2000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onComplete(() => {
          astro.lookAt(controller.position);
          astro.rotation.x = 0;
          astro.rotation.z = 0;
          mixers[0].clipAction( model.animations[ 11 ] ).stop();
          mixers[0].clipAction( model.animations[ 4 ] ).setDuration( 5 ).play();
        }
        )
        .start();
      

    }

  }

  controller = renderer.xr.getController( 0 );
  controller.addEventListener( 'select', onSelect );
  scene.add( controller );

  reticle = new THREE.Mesh(
    new THREE.RingGeometry( 0.15, 0.2, 32 ).rotateX( - Math.PI / 2 ),
    new THREE.MeshBasicMaterial()
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add( reticle );

  //

  window.addEventListener( 'resize', onWindowResize );

}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );

}

//
// Créer un détecteur de long appui
function longpress() {
  let appui = false;
  let tempsInitial;
  let tempsFinal;

  // Écouter l'événement touchstart pour détecter le début de l'appui
  controller.addEventListener('touchstart', function(event) {
      appui = true;
      tempsInitial = new Date().getTime();
      console.log(tempsInitial);
  });

  // Écouter l'événement touchend pour détecter la fin de l'appui
  controller.addEventListener('touchend', function(event) {
      appui = false;
      tempsFinal = new Date().getTime();
      console.log(tempsFinal);
      
      // Calculer la durée de l'appui
      const duree = tempsFinal - tempsInitial;

      // Vérifier si la durée de l'appui dépasse le seuil spécifié
      if (duree >= 1) {
          // Exécuter la fonction spécifiée
          console.log("dfeznfezfez");
      }
  });
}
function animate() {

  renderer.setAnimationLoop( render );

}

function render( timestamp, frame ) {
  TWEEN.update();  

  for ( let i = 0; i < mixers.length; i ++ ) {

    mixers[ i ].update( 0.1 );

  }
  
  longpress();

  if ( frame ) {

    const referenceSpace = renderer.xr.getReferenceSpace();
    const session = renderer.xr.getSession();

    if ( hitTestSourceRequested === false ) {

      session.requestReferenceSpace( 'viewer' ).then( function ( referenceSpace ) {

        session.requestHitTestSource( { space: referenceSpace } ).then( function ( source ) {

          hitTestSource = source;

        } );

      } );

      session.addEventListener( 'end', function () {

        hitTestSourceRequested = false;
        hitTestSource = null;

      } );

      hitTestSourceRequested = true;

    }

    if ( hitTestSource ) {

      const hitTestResults = frame.getHitTestResults( hitTestSource );

      if ( hitTestResults.length ) {

        const hit = hitTestResults[ 0 ];

        reticle.visible = true;
        reticle.matrix.fromArray( hit.getPose( referenceSpace ).transform.matrix );

      } else {

        reticle.visible = false;

      }

    }

  }
  renderer.render( scene, camera );

}
