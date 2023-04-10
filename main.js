import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import vertexShader from "./shaders/vertex.glsl";
import fragmentShader from "./shaders/fragment.glsl";
import atmosphereVertexShader from "./shaders/atmosphereVertex.glsl";
import atmosphereFragmentShader from "./shaders/atmosphereFragment.glsl";

const globeContainer = document.querySelector(".globe-wrapper");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  globeContainer.offsetWidth / globeContainer.offsetHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  canvas: document.querySelector("canvas"),
});

renderer.setSize(globeContainer.offsetWidth, globeContainer.offsetHeight);
renderer.setPixelRatio(window.devicePixelRatio);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0); // set initial target to center of scene
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

function createPointSpheres(points, controls) {
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
    pointSphere.addEventListener("click", () => {
      controls.target.copy(pointSphere.position);
      controls.update();
    });
    pointSpheres.push(pointSphere);
  }

  return pointSpheres;
}
scene.background = new THREE.Color(0x111111);
camera.position.z = 40;

const points = [
  { lat: 40.7128, lon: -74.006, name: "New York" },
  { lat: 51.5074, lon: -0.1278, name: "London" },
  { lat: -33.8688, lon: 151.2093, name: "Sydney" },
  { lat: 50.27, lon: 30.3124, name: "Kyiv" },
];

const pointSpheres = createPointSpheres(points, controls);

console.log(pointSpheres);

for (const pointSphere of pointSpheres) {
  globeWithAtmosphere.add(pointSphere);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  //   globeWithAtmosphere.rotation.y += 0.001;
}
animate();
