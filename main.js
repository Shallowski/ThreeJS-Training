import * as THREE from "three";
import TWEEN from "@tweenjs/tween.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import vertexShader from "./shaders/vertex.glsl";
import fragmentShader from "./shaders/fragment.glsl";
import atmosphereVertexShader from "./shaders/atmosphereVertex.glsl";
import atmosphereFragmentShader from "./shaders/atmosphereFragment.glsl";

const globeContainer = document.querySelector(".globe-wrapper");
const duration = 1000;
let globeRotationStopped = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  globeContainer.offsetWidth / globeContainer.offsetHeight,
  0.1,
  1000
);

scene.background = new THREE.Color(0x111111);
camera.position.set(
  22.237025627237497,
  30.993319159360567,
  -13.000725315904328
);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  canvas: document.querySelector("canvas"),
});

renderer.setSize(globeContainer.offsetWidth, globeContainer.offsetHeight);
renderer.setPixelRatio(window.devicePixelRatio);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0); // set initial target to center of scene
controls.maxDistance = 45;
controls.update(); // apply initial settings

// create a globe

const globeGeometry = new THREE.SphereGeometry(20, 200, 200);

const globeShaderMaterial = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    globeTexture: {
      value: new THREE.TextureLoader().load("./src/img/globe2.jpg"),
    },
  },
});

const globe = new THREE.Mesh(globeGeometry, globeShaderMaterial);

// create atmosphere
const atmosphereGeometry = new THREE.SphereGeometry(21, 50, 50);
const atmosphereShaderMaterial = new THREE.ShaderMaterial({
  vertexShader: atmosphereVertexShader,
  fragmentShader: atmosphereFragmentShader,
  blending: THREE.AdditiveBlending,
  side: THREE.BackSide,
});

const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereShaderMaterial);
atmosphere.scale.set(1.2, 1.2, 1.2);

const globeWithAtmosphere = new THREE.Group();
globeWithAtmosphere.add(globe);
globeWithAtmosphere.add(atmosphere);

scene.add(globeWithAtmosphere);

function latLongToVector3(lat, lon, radius, height) {
  const phi = (lat * Math.PI) / 180;
  const theta = ((lon - 180) * Math.PI) / 180;
  const x = -(radius + height) * Math.cos(phi) * Math.cos(theta);
  const y = (radius + height) * Math.sin(phi);
  const z = (radius + height) * Math.cos(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

function createPointSpheres(points) {
  const pointSphereGeometry = new THREE.SphereGeometry(0.3, 20, 20);
  const pointSphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pointSpheres = [];

  for (const point of points) {
    const position = latLongToVector3(point.lat, point.lon, 20, 0.3);
    const pointSphere = new THREE.Mesh(
      pointSphereGeometry,
      pointSphereMaterial
    );
    pointSphere.position.set(position.x, position.y, position.z);
    pointSphere.userData.name = point.name; // add name to user data
    pointSpheres.push(pointSphere);
  }

  return pointSpheres;
}

const points = [
  { lat: 40.7128, lon: -74.006, name: "New York" },
  { lat: 51.5074, lon: -0.1278, name: "London" },
  { lat: -33.8688, lon: 151.2093, name: "Sydney" },
  { lat: 50.45, lon: 30.5233, name: "Kyiv" },
  { lat: -33.9188, lon: 18.4233, name: "Cape Town" },
  { lat: -33.4474, lon: -70.6736, name: "Santiago" },
];

const pointSpheres = createPointSpheres(points);

for (const pointSphere of pointSpheres) {
  globeWithAtmosphere.add(pointSphere);
}

function onMouseDown(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  const left = event.clientX - rect.left;
  const top = event.clientY - rect.top;

  const x = (left / rect.width) * 2 - 1;
  const y = -(top / rect.height) * 2 + 1;

  const raycaster = new THREE.Raycaster();
  raycaster.ray.origin.setFromMatrixPosition(camera.matrixWorld);
  raycaster.ray.direction
    .set(x, y, 0.5)
    .unproject(camera)
    .sub(raycaster.ray.origin)
    .normalize();

  const intersects = raycaster.intersectObjects(pointSpheres);
  if (intersects.length > 0) {
    const pointSphere = intersects[0].object;
    const endPosition = pointSphere.position
      .clone()
      .multiplyScalar(1.2)
      .add(new THREE.Vector3(0, 0, 0));
    const startPosition = camera.position.clone();
    const transitPosition = pointSphere.position
      .clone()
      .multiplyScalar(2)
      .add(new THREE.Vector3(0, 0, 0)); // new transition point

    new TWEEN.Tween(startPosition)
      .to(transitPosition, duration)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate(() => {
        camera.position.copy(startPosition);
        controls.target.set(0, 0, 0); // set initial target to center of scene
        controls.update();
      })
      .chain(
        new TWEEN.Tween(transitPosition)
          .to(endPosition, duration)
          .easing(TWEEN.Easing.Quadratic.InOut)
          .onUpdate(() => {
            camera.position.copy(transitPosition);
          })
          .onComplete(() => {
            controls.target.copy(pointSphere.position); // change the camera angle
            controls.update();
          })
      )
      .start();
    // Stop the rotation of the globe during mouse hover
    globeRotationStopped = true;
  }

  if (event.button === 2) {
    // right mouse button
    const startPosition = camera.position.clone();
    const endPosition = camera.position.clone().multiplyScalar(1.7);
    const resetTarget = new THREE.Vector3(0, 0, 0);

    new TWEEN.Tween(startPosition)
      .to(endPosition, duration)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate(() => {
        camera.position.copy(startPosition);
        controls.target.copy(resetTarget);
        controls.update();
      })
      .onComplete(() => {
        globeRotationStopped = false;
      })
      .start();
  }
}

document.addEventListener("mousedown", onMouseDown);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  TWEEN.update();
  renderer.render(scene, camera);
  // if (!globeRotationStopped) {
  //   globeWithAtmosphere.rotation.y += 0.001;
  // }
}
animate();
