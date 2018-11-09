import THREE from './threejs-service';

export function initScene() {
    const scene = new THREE.Scene();
    // fogColor = new THREE.Color(0xffffff);

    scene.background = new THREE.Color(0xeeeeee);
    scene.fog = new THREE.Fog(0xeeeeee, 1, 20);

    return scene;
}

export function initCamera() {
    const camera = new THREE.PerspectiveCamera(
        75,
        (6 / 5) * (window.innerWidth / window.innerHeight),
        0.001,
        1000
    );

    // Camera position in space (will be controled by the OrbitControls later on)
    camera.position.set(-1, 2, 2);

    return camera;
}

export function initRenderer(canvasElement, pixelRatio) {
    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas: canvasElement
    });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

    if (pixelRatio) {
        renderer.setPixelRatio(window.devicePixelRatio * pixelRatio);
    }
    renderer.setSize((6 / 5) * window.innerWidth, window.innerHeight); // Configure renderer size

    return renderer;
}

export function initControls(camera, canvas) {
    const controls = new THREE.OrbitControls(camera, canvas);
    // controls.target.set(-1,0,0);
    controls.minDistance = 2; //Controling max and min for ease of use
    controls.maxDistance = 7;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI / 2 - 0.1;
    controls.enablePan = false;

    return controls;
}

export function initLights() {
    //hemisphere light: like sun light but without any shadows
    const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff);

    //Create a PointLight and turn on shadows for the light
    const light = new THREE.PointLight(0xc1c1c1, 1, 100);
    light.position.set(3, 10, 10);
    light.castShadow = true;
    //Set up shadow properties for the light
    light.shadow.mapSize.width = 2048; // default
    light.shadow.mapSize.height = 2048; // default
    light.decay = 1;

    // This light is here to show the details in the back (no shadows)
    const backlight = new THREE.PointLight(0xc4b0ac, 1, 100);
    backlight.position.set(0, 2, -20);
    backlight.penumbra = 2;

    return [hemi, light, backlight];
}

export function initFloor() {
    //Create a plane that receives shadows (but does not cast them)
    const planeGeometry = new THREE.PlaneBufferGeometry(10, 10);
    const planeMaterial = new THREE.ShadowMaterial();
    planeMaterial.opacity = 0.2;

    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.name = "plane";
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0;
    plane.receiveShadow = true;
    
    return plane;
}

export function initGridHelper() {

    const size = 50;
    const divisions = 60;

    const gridHelper = new THREE.GridHelper(size, divisions);

    return gridHelper;
}