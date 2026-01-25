import * as THREE from 'https://unpkg.com/three@0.126.1/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.126.1/examples/jsm/controls/OrbitControls.js';
import { Tween, Easing } from 'https://unpkg.com/@tweenjs/tween.js@23.1.3/dist/tween.esm.js'
import * as BufferGeometryUtils from 'https://unpkg.com/three@0.126.1/examples/jsm/utils/BufferGeometryUtils.js';
import getStarfield from "./stars.js";


class App {
    constructor() {
        this.recentlyInteracted = false;
        this.canvas = document.querySelector('canvas.scene')
        this.canvasContainer = document.querySelector('#content')
        this.sizes = {
            width: this.canvasContainer.clientWidth,
            height: this.canvasContainer.clientHeight
        }
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        })

        this.scene = new THREE.Scene()
        this.camera = new THREE.PerspectiveCamera(45, this.sizes.width / this.sizes.height)
        this.camera.position.set(0, 0, 100)
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.rect = this.renderer.domElement.getBoundingClientRect();

        this.globe = new THREE.Group()
        this.targetObject = null;

        this.cameraTween = null
        this.animate = this.animate.bind(this);

        this.rotationSpeed = 0.001
        this.tweens = []

    }

    async loadJSON() {
        try {
            const response = await fetch('./data.json');
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(error);
        }
    }

    resize() {
        this.sizes.width = this.canvasContainer.clientWidth
        this.sizes.height = this.canvasContainer.clientHeight
        this.renderer.setSize(this.sizes.width, this.sizes.height)
        this.camera.aspect = this.sizes.width / this.sizes.height
        this.camera.updateProjectionMatrix()
        this.rect = this.renderer.domElement.getBoundingClientRect();
    }


    async init() {
        if (this.cameraTween != null) return
        let data = await this.loadJSON();

        window.addEventListener("resize", (event) => {
            this.resize()
        })
        window.addEventListener("click", (event) => {
            this.recentlyInteracted = true;
            console.log(event.clientX, event.clientY)
        })



        this.controls.enableDamping = true;
        this.controls.maxDistance = 100;
        this.controls.minDistance = 1.5;
        this.controls.enablePan = false;
        this.controls.update()

        this.renderer.setSize(this.sizes.width, this.sizes.height)
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))


        // Object

        const textureLoader = new THREE.TextureLoader()
        const colorMap = textureLoader.load("8081_earthmap10k.jpg")
        //const nightMap = textureLoader.load("8081_earthlights10k.jpg")
        const alphaMap = textureLoader.load("8081_earthspec10k.jpg")
        const elevMap = textureLoader.load("8081_earthbump10k.jpg")


        const stars = getStarfield({ numStars: 1000 })
        this.scene.add(stars)

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
        this.globe.add(mesh)

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
        this.globe.add(seaMesh)

        this.scene.add(this.globe)
        this.scene.add(this.camera)

        //points
        const poiGroup = new THREE.Group();
        const addPoints = (name) => {
            if (poiGroup.children.length > 0) {
                poiGroup.children.forEach(poi => {
                    this.tweens.push(new Tween(poi.position, false) // Create a new tween that modifies 'coords'.
                        .to({ x: poi.position.x * 10, y: poi.position.y * 10, z: poi.position.z * 10 }, 3000) // Move to (300, 200) in 1 second.
                        .easing(Easing.Quadratic.InOut) // Use an easing function to make the animation smooth.
                        .onUpdate(() => {
                            poi.position
                        })
                        .start() // Start the tween immediately.
                        .onComplete(() => {
                            poiGroup.remove(poi)
                        }));
                });
            }
            let poi = data[name];
            //console.log(poi["points"]);
            console.log(this.tweens);


            let diskMesh = new THREE.MeshBasicMaterial({ color: 0x4c4c4c });
            let domeMesh = new THREE.MeshBasicMaterial({ color: 0x2c73d2 });
            let lightMesh = new THREE.MeshStandardMaterial({
                color: 0x00ff00,       // kolor podstawowy (zielony)
                transparent: true,     // włącz przezroczystość
                opacity: 0.5,          // 0 = całkowicie przezroczysty, 1 = pełny kolor
                emissive: 0x00ff00,    // kolor świecącej części
                emissiveIntensity: 0.8 // siła świecenia
            });
            let diskGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.002, 10)
            let domeGeometry = new THREE.SphereGeometry(0.006, 8, 8);
            let lightGeometry = new THREE.CylinderGeometry(0.004, 0.028, 0.1, 6)
            let outlineMaterial = new THREE.MeshBasicMaterial({
                color: 0x000000,  // kolor obrysu
                side: THREE.BackSide // renderujemy od tyłu
            });
            let innerOutlineGeometry = new THREE.CylinderGeometry(0.006, 0.006, 0.004, 16)
            let outlineInnerMaterial = new THREE.MeshBasicMaterial({
                color: 0x000000,
            });
            let points = poi["points"]
            for (let p in points) {
                console.log(points[p]);
                let light = new THREE.Mesh(lightGeometry, lightMesh);
                lightMesh.color.set(0xaaffaa)
                light.position.set(0, -0.05, 0);
                let disk = new THREE.Mesh(diskGeometry, diskMesh);
                let dome = new THREE.Mesh(domeGeometry, domeMesh);
                let outlineMeshOuter = new THREE.Mesh(diskGeometry, outlineMaterial);
                outlineMeshOuter.scale.multiplyScalar(1.1);
                let outlineMeshInner = new THREE.Mesh(innerOutlineGeometry, outlineInnerMaterial);
                let ufo = new THREE.Group();
                ufo.add(disk);
                ufo.add(dome);
                ufo.add(light);
                ufo.add(outlineMeshOuter);
                ufo.add(outlineMeshInner);

                let coords = points[p].coordinates.map(x => x * 1.1);
                ufo.position.set(
                    coords[0] * 10,
                    coords[1] * 10,
                    coords[2] * 10);
                ufo.lookAt(new THREE.Vector3(0, 0, 0));
                ufo.rotateX(-Math.PI / 2);

                ufo.name = points[p].name;
                ufo.image = points[p].image;
                ufo.description = points[p].description;

                poiGroup.add(ufo);
                this.tweens.push(new Tween(ufo.position, false) // Create a new tween that modifies 'coords'.
                    .to({ x: coords[0], y: coords[1], z: coords[2] }, 3000) // Move to (300, 200) in 1 second.
                    .easing(Easing.Circular.Out) // Use an easing function to make the animation smooth.
                    .onUpdate(() => {
                    })
                    .start() // Start the tween immediately.
                    .onComplete(() => {

                    }));
            }
            this.globe.add(poiGroup);
        };

        //points to html list

        let keys = Object.keys(data)
        let menu = document.getElementById("dropdownPointMenu")
        for (let i in keys) {
            let div = document.createElement("div");
            div.className = "pointOption";
            div.textContent = data[keys[i]].title;

            div.addEventListener("click", () => {
                addPoints(keys[i]);
            });

            menu.appendChild(div);
        }


        //Raycaster
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let infoBox;
        window.addEventListener('click', (event) => {
            if (window.document.body.contains(infoBox)) {
                window.document.body.removeChild(infoBox);
            }
            mouse.x = ((event.clientX - this.rect.left) / this.rect.width) * 2 - 1;
            mouse.y = -((event.clientY - this.rect.top) / this.rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, this.camera);
            const intersects = raycaster.intersectObjects(poiGroup.children, true);
            //console.log(intersects[0].point);
            if (intersects.length > 0) {
                this.targetObject = intersects[0].object;
                console.log('Clicked on object:', this.targetObject.parent);
                console.log(this.targetObject.position);

                if (this.targetObject.parent.name) {
                    let element = this.targetObject.parent;
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
            //event.preventDefault();
            if (window.document.body.contains(infoBox)) {
                window.document.body.removeChild(infoBox);
                console.log("removed");
            }
        });
        window.addEventListener('mousemove', this.drag);

        this.targetObject = poiGroup.children[1];
        this.globe.renderOrder = 1;
        poiGroup.renderOrder = 2;

        this.cameraTween = new Tween(this.camera.position, false) // Create a new tween that modifies 'coords'.
            .to({ x: 0, y: 0, z: 5 }, 3000) // Move to (300, 200) in 1 second.
            .easing(Easing.Quadratic.InOut) // Use an easing function to make the animation smooth.
            .onUpdate(() => {
                this.camera.lookAt(this.globe.position);
            })
            .start() // Start the tween immediately.
            .onComplete(() => {
                this.controls.maxDistance = 10
            });
        requestAnimationFrame(this.animate)
    }

    drag = (event) => {
        mouse.x = ((event.clientX - this.rect.left) / this.rect.width) * 2 - 1;
        mouse.y = -((event.clientY - this.rect.top) / this.rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, this.camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        console.log(this.targetObject.position);
        if (intersects.length > 1) {
            let norm = intersects[0].point.normalize();
            this.targetObject.position.set(norm.x, norm.y, norm.z);
        }
    }


    animate(time) {
        this.cameraTween.update(time);
        this.tweens.forEach(tween => {
            tween.update(time)
        });
        time += 0.01;
        //uniforms.time = { value: time }
        // console.log(this.recentlyInteracted);

        if (!this.recentlyInteracted) {
            this.globe.rotation.y += this.rotationSpeed;
        }


        if (this.targetObject) {
            window.addEventListener('mousemove', this.drag);
        } else {
            window.removeEventListener('mousemove', this.drag);
        }

        this.controls.update();

        this.renderer.render(this.scene, this.camera)

        requestAnimationFrame(this.animate)
    }
}


export { App }