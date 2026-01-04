import * as THREE from 'https://unpkg.com/three@0.126.1/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.126.1/examples/jsm/controls/OrbitControls.js';
import getStarfield from "./stars.js";

// Scene

function init() {
    const canvas = document.querySelector('canvas.scene')
    const canvasContainer = document.querySelector('#content')
    const sizes = {
        width: canvasContainer.clientWidth,
        height: canvasContainer.clientHeight
    }
    window.addEventListener("resize", (event) => {
        sizes.width = canvasContainer.clientWidth
        sizes.height = canvasContainer.clientHeight
        renderer.setSize(sizes.width, sizes.height)
        camera.aspect = sizes.width / sizes.height
        camera.updateProjectionMatrix()
    })



    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height)
    camera.position.set(0, 0, 3)
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true
    })
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.update()

    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))


    // Object
    const globe = new THREE.Group()

    const textureLoader = new THREE.TextureLoader()
    const colorMap = textureLoader.load("8081_earthmap10k.jpg")
    const nightMap = textureLoader.load("8081_earthlights10k.jpg")
    const alphaMap = textureLoader.load("8081_earthspec10k.jpg")
    const elevMap = textureLoader.load("8081_earthbump10k.jpg")


    const stars = getStarfield({ numStars: 1000 })
    scene.add(stars)

    const detail = 300;
    const pointsGeo = new THREE.IcosahedronGeometry(1, detail);
    const vertexShader = `
        uniform float size;
        uniform sampler2D pointTexture;
        uniform float time;

        varying vec2 vUv;
        varying float vElevation;    
        varying float vVisible;


        void main(){
            vUv = uv;
            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
            vec3 vNormal = normalMatrix * normal;
            vVisible = step(0.0, dot( -normalize(mvPosition.xyz), normalize(vNormal)));
            vElevation = texture2D( pointTexture, uv ).r;
            //mvPosition.z = mvPosition.z - 10.0/(time*(mvPosition.y/100.0+1.0));
            mvPosition.z = mvPosition.z - normalize( mvPosition ).z * vElevation * .20;
            gl_PointSize = size;
            gl_Position = projectionMatrix * mvPosition;    
        }
    `

    const fragmentShader = `
        uniform sampler2D colorMap;
        uniform sampler2D alphaMap;
        uniform float alphaChannel;
    
        varying vec2 vUv;
        varying float vElevation;
        varying float vVisible;

        void main(){
            if (floor(vVisible + 0.1) == 0.0) discard;

            vec3 color = texture2D( colorMap, vUv ).rgb;
            float alpha=0.0;
            if (alphaChannel == 1.0){
                alpha = 1.0 - texture2D( alphaMap, vUv ).r ;
            }
            if (alphaChannel == 0.0){
               alpha = texture2D( alphaMap, vUv ).r ;
               if (alpha < 0.5) discard;
            }
            gl_FragColor = vec4( color, alpha);
            }
    `

    const uniforms = {
        time: { type: "f", value: 0 },
        size: { type: "f", value: 5 },
        pointTexture: { type: "t", value: elevMap },
        colorMap: { type: "t", value: colorMap },
        alphaMap: { type: "t", value: alphaMap },
        alphaChannel: { type: "f", value: 1.0 }
    }

    const pointsMat = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        wireframe: true
    })
    const mesh = new THREE.Mesh(pointsGeo, pointsMat)
    globe.add(mesh)

    const uniforms2 = {
        time: { type: "f", value: 0 },
        size: { type: "f", value: 5 },
        pointTexture: { type: "t", value: elevMap },
        colorMap: { type: "t", value: colorMap },
        alphaMap: { type: "t", value: alphaMap },
        alphaChannel: { type: "f", value: 0.0 }
    }
    const seaGeo = new THREE.IcosahedronGeometry(1, 7)
    const seaMat = new THREE.ShaderMaterial({
        uniforms: uniforms2,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: false,
        wireframe: true
    })
    const seaMesh = new THREE.Mesh(seaGeo, seaMat)
    globe.add(seaMesh)

    scene.add(globe)
    scene.add(camera)

    let time = 0;
    function animate() {


        //globe.rotation.y += 0.001;
        time += 0.1;
        uniforms.time = { value: time }
        controls.update();
        renderer.render(scene, camera)

        requestAnimationFrame(animate)
    }

    animate()


}




export { init }