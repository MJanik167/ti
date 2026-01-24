import * as THREE from 'https://unpkg.com/three@0.126.1/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.126.1/examples/jsm/controls/OrbitControls.js';
import { Tween, Easing } from 'https://unpkg.com/@tweenjs/tween.js@23.1.3/dist/tween.esm.js'
import * as BufferGeometryUtils from 'https://unpkg.com/three@0.126.1/examples/jsm/utils/BufferGeometryUtils.js';
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
    camera.position.set(0, 0, 100)
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true
    })
    let rect = renderer.domElement.getBoundingClientRect();
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxDistance = 100;
    controls.minDistance = 1.5;
    controls.enablePan = false;
    controls.update()

    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))


    // Object
    const globe = new THREE.Group()

    const textureLoader = new THREE.TextureLoader()
    const colorMap = textureLoader.load("8081_earthmap10k.jpg")
    //const nightMap = textureLoader.load("8081_earthlights10k.jpg")
    const alphaMap = textureLoader.load("8081_earthspec10k.jpg")
    const elevMap = textureLoader.load("8081_earthbump10k.jpg")


    const stars = getStarfield({ numStars: 1000 })
    scene.add(stars)

    const detail = 90;

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
    const addPoints = (name) => {
        if (poiGroup.children.length > 0) {
            poiGroup.clear();
        }
        let poi = data[name];

        let diskMesh = new THREE.MeshBasicMaterial({ color: 0x4c4c4c });
        let domeMesh = new THREE.MeshBasicMaterial({ color: 0x00bfc9 });
        let lightMesh = new THREE.MeshStandardMaterial({
            color: 0x00ff00,       // kolor podstawowy (zielony)
            transparent: true,     // włącz przezroczystość
            opacity: 0.5,          // 0 = całkowicie przezroczysty, 1 = pełny kolor
            emissive: 0x00ff00,    // kolor świecącej części
            emissiveIntensity: 0.8 // siła świecenia
        });
        //let geometry = [new THREE.SphereGeometry(0.005, 16, 16)];
        let diskGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.002, 16)
        let domeGeometry = new THREE.SphereGeometry(0.006, 32, 16);
        let lightGeometry = new THREE.CylinderGeometry(0.004, 0.02, 0.1, 16)
        let outlineMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,  // kolor obrysu
            side: THREE.BackSide // renderujemy od tyłu
        });
        for (let p in poi) {
            console.log(poi[p].coordinates);

            let light = new THREE.Mesh(lightGeometry, lightMesh);
            light.position.set(0, -0.05, 0);
            let disk = new THREE.Mesh(diskGeometry, diskMesh);
            let dome = new THREE.Mesh(domeGeometry, domeMesh);
            let outlineMesh = new THREE.Mesh(diskGeometry, outlineMaterial);
            outlineMesh.scale.multiplyScalar(1.05); // minimalnie większy
            let ufo = new THREE.Group();
            ufo.add(disk);
            ufo.add(dome);
            ufo.add(light);
            disk.add(outlineMesh);
            let coords = poi[p].coordinates.map(x => x * 1.1);
            ufo.position.set(
                coords[0],
                coords[1],
                coords[2]);
            ufo.lookAt(new THREE.Vector3(0, 0, 0));
            ufo.rotateX(-Math.PI / 2);
            ufo.name = poi[p].name;
            ufo.image = poi[p].image;
            ufo.description = poi[p].description;
            poiGroup.add(ufo);
        }
        globe.add(poiGroup);
    };

    //Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let infoBox;
    let targetObject = document.createElement('div');;
    window.addEventListener('click', (event) => {
        if (window.document.body.contains(infoBox)) {
            window.document.body.removeChild(infoBox);
        }
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(poiGroup.children, true);
        //console.log(intersects[0].point);
        if (intersects.length > 0) {
            targetObject = intersects[0].object;
            console.log('Clicked on object:', targetObject.parent);
            console.log(targetObject.position);

            if (targetObject.parent.name) {
                let element = targetObject.parent;
                infoBox = document.createElement('div');
                infoBox.classList.add('infoBox');
                infoBox.style.top = (event.clientY - 250) + 'px';
                infoBox.style.left = (event.clientX + 30) + 'px';
                window.document.body.appendChild(infoBox);
                infoBox.innerHTML = `
                <div class="textContainer"> 
                    <h2>${element.name}</h2><p>${element.description}</p>
                </div>
                 <div class="imageContainer">
                    <img src="${element.image}" alt="${element.name}" />
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
    let rotationSpeed = 0.001;

    addPoints("10miast_afryki")

    const cameraTween = new Tween(camera.position, false) // Create a new tween that modifies 'coords'.
        .to({ x: 0, y: 0, z: 5 }, 3000) // Move to (300, 200) in 1 second.
        .easing(Easing.Quadratic.InOut) // Use an easing function to make the animation smooth.
        .onUpdate(() => {
            camera.lookAt(globe.position);
        })
        .start() // Start the tween immediately.
        .onComplete(() => {
            controls.maxDistance = 10
        }
        );

    function animate(time) {
        cameraTween.update(time);
        time += 0.01;
        //uniforms.time = { value: time }
        if (!recentlyInteracted) {
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

    requestAnimationFrame(animate)


}




export { init }