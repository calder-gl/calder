import { Light } from '../renderer/interfaces/Light';
import { Renderer } from '../renderer/Renderer';

import { vec3 } from 'gl-matrix';
import { range } from 'lodash';
import { GeometryNode } from '../armature/GeometryNode';

const light1: Light = { lightPosition: [10, 10, 10], lightColor: [1, 1, 1], lightIntensity: 256 };
const light2: Light = { lightPosition: [700, 500, 50], lightColor: [3, 3, 3], lightIntensity: 100 };

const renderer: Renderer = new Renderer(800, 600, 2);

// Add lights to the renderer
renderer.addLight(light1);
renderer.addLight(light2);

const transform = vec3.fromValues(0, 0, -4);
const vertices: vec3[] = [];
const normals: vec3[] = [];
const indices: number[] = [];
const colors: vec3[] = [];

const numLat = 20;
const numLong = 20;

// Generate the normals and vertices arrays
range(numLat).forEach((lat: number) => {
    const theta = lat * Math.PI / numLat;

    range(numLong).forEach((long: number) => {
        const phi = long * 2 * Math.PI / numLong;
        const x = Math.cos(phi) * Math.sin(theta);
        const y = Math.cos(theta);
        const z = Math.sin(phi) * Math.sin(theta);

        normals.push(vec3.fromValues(x, y, z));
        vertices.push(vec3.fromValues(x, y, z));
    });
});

// Generate indices array
range(numLat - 1).forEach((lat: number) => {
    range(numLong - 1).forEach((long: number) => {
        const first = lat * numLong + long;
        const second = first + numLong;

        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
    });
});

colors.push(...vertices.map(() => vec3.fromValues(1, 0, 0)));

document.body.appendChild(renderer.stage);

renderer.camera.moveTo(vec3.fromValues(0, 0, 4));
renderer.camera.lookAt(vec3.fromValues(2, 0, -4));

// Create the armature
const geometryNode = new GeometryNode({ vertices, normals, indices, colors });
geometryNode.setPosition(transform);

// Draw the armature
renderer.draw([geometryNode], true);
