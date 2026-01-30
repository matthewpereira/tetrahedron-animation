import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';

// ===========================
// Scene, Camera, Renderer Setup
// ===========================

const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff); // Notion white background

const camera = new THREE.PerspectiveCamera(
  35, // Reduced FOV to zoom in and fill vertical space
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(4, 2.5, 4); // Adjusted position for better framing

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// ===========================
// OrbitControls Setup
// ===========================

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = true;
controls.enableRotate = true;

// ===========================
// Lighting
// ===========================

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// ===========================
// Tetrahedron Geometry
// ===========================

// Define vertices for a perfect regular tetrahedron (all edges equal)
// Using alternating vertices of a cube for perfect symmetry
const vertices = new Float32Array([
  1, 1, 1,     // Vertex 0
  1, -1, -1,   // Vertex 1
  -1, 1, -1,   // Vertex 2
  -1, -1, 1    // Vertex 3
]);

// Define faces (each face is a triangle with 3 vertex indices)
const indices = new Uint16Array([
  0, 2, 1, // Face 1
  0, 1, 3, // Face 2
  0, 3, 2, // Face 3
  1, 2, 3  // Face 4 (bottom)
]);

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
geometry.setIndex(new THREE.BufferAttribute(indices, 1));
geometry.computeVertexNormals();

// Translucent material with subtle tint for glassmorphism effect
const material = new THREE.MeshPhongMaterial({
  color: 0x5a6270, // Slate gray with subtle blue tint
  transparent: true,
  opacity: 0.55,
  side: THREE.DoubleSide,
  shininess: 100,
});

const tetrahedron = new THREE.Mesh(geometry, material);
scene.add(tetrahedron);

// Thick wireframe overlay using LineSegments2 for actual thick lines
const edges = [
  0, 1,  // Edge between vertex 0 and 1
  0, 2,  // Edge between vertex 0 and 2
  0, 3,  // Edge between vertex 0 and 3
  1, 2,  // Edge between vertex 1 and 2
  1, 3,  // Edge between vertex 1 and 3
  2, 3   // Edge between vertex 2 and 3
];

const positions: number[] = [];
for (let i = 0; i < edges.length; i += 2) {
  const v1Index = edges[i];
  const v2Index = edges[i + 1];

  positions.push(
    vertices[v1Index * 3],
    vertices[v1Index * 3 + 1],
    vertices[v1Index * 3 + 2],
    vertices[v2Index * 3],
    vertices[v2Index * 3 + 1],
    vertices[v2Index * 3 + 2]
  );
}

const lineGeometry = new LineSegmentsGeometry();
lineGeometry.setPositions(positions);

const lineMaterial = new LineMaterial({
  color: 0x2a3240, // Dark slate for sharpie-like edges
  linewidth: 1, // In pixels (will render as actual thick lines)
  transparent: true,
  opacity: 0.95,
  resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
});

const wireframeMesh = new LineSegments2(lineGeometry, lineMaterial);
scene.add(wireframeMesh);

// ===========================
// Vertex Markers (Small Spheres)
// ===========================

const vertexPositions = [
  new THREE.Vector3(1, 1, 1),
  new THREE.Vector3(1, -1, -1),
  new THREE.Vector3(-1, 1, -1),
  new THREE.Vector3(-1, -1, 1)
];

const markerGeometry = new THREE.SphereGeometry(0.05, 16, 16);
const markerMaterial = new THREE.MeshBasicMaterial({
  color: 0x6b7280, // Subtle gray markers
  transparent: true,
  opacity: 0.8
});

const markers: THREE.Mesh[] = [];
vertexPositions.forEach((pos) => {
  const marker = new THREE.Mesh(markerGeometry, markerMaterial);
  marker.position.copy(pos);
  scene.add(marker);
  markers.push(marker);
});

// ===========================
// Label Elements
// ===========================

const labelElements: HTMLElement[] = [
  document.getElementById('label-0')!,
  document.getElementById('label-1')!,
  document.getElementById('label-2')!,
  document.getElementById('label-3')!
];

// ===========================
// Dark Mode Toggle
// ===========================

const darkModeToggle = document.getElementById('dark-mode-toggle')!;
let isDarkMode = false;

darkModeToggle.addEventListener('click', () => {
  isDarkMode = !isDarkMode;
  document.body.classList.toggle('dark-mode');

  // Update scene background color
  if (isDarkMode) {
    scene.background = new THREE.Color(0x191919); // Dark mode background
  } else {
    scene.background = new THREE.Color(0xffffff); // Light mode background
  }
});

// ===========================
// Update Label Positions
// ===========================

function updateLabelPositions() {
  markers.forEach((marker, index) => {
    // Get the current world position of the marker (which follows the rotation)
    const worldPos = marker.position.clone();

    // Project 3D world position to 2D screen space
    const screenPos = worldPos.project(camera);

    // Convert normalized device coordinates (-1 to +1) to screen pixels
    const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
    const y = ((-screenPos.y) * 0.5 + 0.5) * window.innerHeight;

    const label = labelElements[index];
    label.style.left = `${x}px`;
    label.style.top = `${y}px`;

    // Hide label if vertex is behind the camera (simple heuristic: z > 1 in NDC)
    // or if it's too far in front (optional)
    if (screenPos.z > 1 || screenPos.z < -1) {
      label.style.opacity = '0';
    } else {
      label.style.opacity = '1';
    }
  });
}

// ===========================
// Window Resize Handler
// ===========================

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  lineMaterial.resolution.set(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize);

// ===========================
// Animation Loop
// ===========================

function animate() {
  requestAnimationFrame(animate);

  // Rotation speed calculated for exactly 30 seconds per full rotation
  // At 60 FPS: (2π radians) / (30 seconds × 60 frames/second) = 0.003491 radians/frame
  const rotationSpeed = (2 * Math.PI) / (30 * 60);
  tetrahedron.rotation.y += rotationSpeed;
  tetrahedron.rotation.x += rotationSpeed * 0.5;
  wireframeMesh.rotation.y += rotationSpeed;
  wireframeMesh.rotation.x += rotationSpeed * 0.5;

  // Update marker positions to match rotation
  markers.forEach((marker, index) => {
    const rotatedPos = vertexPositions[index].clone();
    rotatedPos.applyEuler(tetrahedron.rotation);
    marker.position.copy(rotatedPos);
  });

  // Update controls (required when damping is enabled)
  controls.update();

  // Update label positions every frame
  updateLabelPositions();

  // Render the scene
  renderer.render(scene, camera);
}

animate();
