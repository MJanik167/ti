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
    const elevMap = textureLoader.load("8081_earthbump10k.jpg")

    const geo = new THREE.IcosahedronGeometry(1, 10)
    const mat = new THREE.PointsMaterial({
        color: 0xffffff,
        map: elevMap,
        transparenct: false,
    })
    const icosahedron = new THREE.Points(geo, mat)
    //globe.add(icosahedron)
    const stars = getStarfield({ numStars: 1000 })
    scene.add(stars)

    const detail = 300;
    const pointsGeo = new THREE.IcosahedronGeometry(1, detail);
    const vertexShader = `
        uniform float size;
        uniform sampler2D pointTexture;

        varying vec2 vUv;
        varying float vElevation;

        void main(){
            vUv = uv;
            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
            vElevation = texture2D( pointTexture, uv ).r;
            mvPosition.z = mvPosition.z - normalize( mvPosition ).z * vElevation * .20;
            gl_PointSize = size;
            gl_Position = projectionMatrix * mvPosition;    
        }
    `

    const fragmentShader = `
        uniform sampler2D colorMap;
        vec3 pal( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d )
        {
            return a + b*cos( 6.28318*(c*t+d) );
        }

        vec3 earthPalette(float t)
        {
        return pal(
                t,
                vec3(0.698, 0.638, -1.532),  // a: base (light, warm)
                vec3(0.500, 0.388, -2.562),  // b: contrast
                vec3(-0.922, -0.032, 0.418),  // c: frequency
                vec3(0.000, -0.002, -1.892)   // d: phase shift
            );
        }

    
        varying vec2 vUv;
        varying float vElevation;

        void main(){
            vec3 color = texture2D( colorMap, vUv ).rgb;
            float alpha = 1.0;
            if (vElevation > 0.01) {
            alpha = 1.0;
            }

            gl_FragColor = vec4( color, alpha );
            }
    `

    const uniforms = {
        size: { type: "f", value: 5 },
        pointTexture: { type: "t", value: elevMap },
        colorMap: { type: "t", value: colorMap }
    }

    const pointsMat = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true
    })
    const mesh = new THREE.Mesh(pointsGeo, pointsMat)
    globe.add(mesh)

    scene.add(globe)
    scene.add(camera)
    function animate() {


        //globe.rotation.y += 0.001;

        controls.update();
        renderer.render(scene, camera)

        requestAnimationFrame(animate)
    }

    animate()


}




export { init }