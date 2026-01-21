import * as THREE from 'https://unpkg.com/three@0.126.1/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.126.1/examples/jsm/controls/OrbitControls.js';
import getStarfield from "./stars.js";

// Scene
let recentlyInteracted = false;

async function loadJSON() {
    try {
        const response = await fetch('./data.json');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
    }
}


async function init() {

    let data = await loadJSON();
    console.log(data);



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
        rect = renderer.domElement.getBoundingClientRect();
    })
    window.addEventListener("click", (event) => {
        recentlyInteracted = true;
        console.log(event.clientX, event.clientY)
    })


    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height)
    camera.position.set(0, 0, 5)
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true
    })
    let rect = renderer.domElement.getBoundingClientRect();
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxDistance = 10;
    controls.minDistance = 1.5;
    controls.enablePan = false;
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
        uniform float alphaChannel;

        varying vec2 vUv;
        varying float vElevation;    
        varying float vVisible;


        void main(){
            vUv = uv;
            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
            vec3 vNormal = normalMatrix * normal;
            vVisible = step(-0.2, dot( -normalize(mvPosition.xyz), normalize(vNormal)));
            vElevation = texture2D( pointTexture, uv ).r;
            mvPosition.z = mvPosition.z - normalize( mvPosition ).z * vElevation * .20;

            gl_PointSize = size;
            gl_Position = projectionMatrix * mvPosition;    
        }
    `

    const fragmentShader = `
        uniform sampler2D colorMap;
        uniform sampler2D alphaMap;
        uniform float alphaChannel;
        uniform float time;

        varying vec2 vUv;
        varying float vElevation;
        varying float vVisible;

        void main(){
            if (floor(vVisible + 0.1) == 0.0) discard;

            vec3 color = texture2D( colorMap, vUv ).rgb;
            float alpha=0.0;
            if (alphaChannel == 1.0){
                alpha = 1.0 - texture2D( alphaMap, vUv ).r ;
                //if(vUv.y*10. > time) discard;
            }
            if (alphaChannel == 0.0){
               alpha = texture2D( alphaMap, vUv ).r ;
               if (alpha < 0.5) discard;
               //if(time<3.141) discard;
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
        wireframe: true,
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
    const seaGeo = new THREE.IcosahedronGeometry(1, 12)
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

    //points
    const poiGroup = new THREE.Group();
    let cuda = data["7c"];
    for (let p in cuda) {
        console.log(cuda[p].coordinates);
        let geometry = new THREE.SphereGeometry(0.005, 16, 16);
        let material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        let sphere = new THREE.Mesh(geometry, material);
        let coords = cuda[p].coordinates.map(x => x * 1.015);
        sphere.position.set(
            coords[0],
            coords[1],
            coords[2]);
        sphere.name = cuda[p].name;
        sphere.image = cuda[p].image;
        sphere.description = cuda[p].description;
        poiGroup.add(sphere);
    }
    globe.add(poiGroup);


    //Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let infoBox;
    let targetObject = document.createElement('div');;
    window.addEventListener('click', (event) => {
        if (window.document.body.contains(infoBox)) {
            window.document.body.removeChild(infoBox);
            console.log("removed");
        }
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        console.log(intersects[0].point);
        if (intersects.length > 0) {
            targetObject = intersects[0].object;
            console.log('Clicked on object:', targetObject);
            console.log(targetObject.position);

            if (targetObject.name) {
                infoBox = document.createElement('div');
                infoBox.classList.add('infoBox');
                infoBox.style.top = (event.clientY - 250) + 'px';
                infoBox.style.left = (event.clientX + 30) + 'px';
                window.document.body.appendChild(infoBox);
                infoBox.innerHTML = `
                <div class="textContainer"> 
                    <h2>${targetObject.name}</h2><p>${targetObject.description}</p>
                </div>
                 <div class="imageContainer">
                    <img src="${targetObject.image}" alt="${targetObject.name}" />
                </div>
                `;
                infoBox.style.display = 'block';
            }
        }
    })

    window.addEventListener('wheel', (event) => {
        if (window.document.body.contains(infoBox)) {
            window.document.body.removeChild(infoBox);
            console.log("removed");
        }
    });
    window.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        if (window.document.body.contains(infoBox)) {
            window.document.body.removeChild(infoBox);
            console.log("removed");
        }
    });

    targetObject = poiGroup.children[1];
    const drag = (event) => {
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        console.log(targetObject.position);

        if (intersects.length > 1) {
            let norm = intersects[0].point.normalize();
            targetObject.position.set(norm.x, norm.y, norm.z);
        }
    }



    let time = 0;
    let rotationSpeed = 0.0000;
    function animate() {

        time += 0.01;
        //uniforms.time = { value: time }
        if (!recentlyInteracted) {
            if (rotationSpeed < 0.001) {
                rotationSpeed += 0.0000001;
            }
            globe.rotation.y += rotationSpeed;
        }

        if (targetObject) {
            //window.addEventListener('mousemove', drag);
        } else {
            window.removeEventListener('mousemove', drag);
        }

        controls.update();


        renderer.render(scene, camera)

        requestAnimationFrame(animate)
    }

    animate()


}




export { init }