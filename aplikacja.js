import * as THREE from "../node_modules/three/build/three.module.js"

// Scene

function init() {

    const canvasContainer = document.querySelector('#content')

    const canvas = document.querySelector('canvas.scene')

    const sizes = {
        width: canvasContainer.clientWidth,
        height: canvasContainer.clientHeight
    }


    const scene = new THREE.Scene()

    // Object
    const geometry = new THREE.BoxGeometry(1, 2, 1)
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 })
    const mesh = new THREE.Mesh(geometry, material)

    scene.add(mesh)

    // Camera
    const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height)
    camera.position.z = 3
    scene.add(camera)

    const renderer = new THREE.WebGLRenderer({
        canvas: canvas
    })


    renderer.setSize(sizes.width, sizes.height)

    function animate() {
        renderer.render(scene, camera)
        mesh.rotation.x = mesh.rotation.x + Math.PI / 200;
        requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)


}




export { init }