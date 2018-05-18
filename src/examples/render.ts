import { Armature } from '../armature/Armature';
import { Node } from '../armature/Node';
import { Light } from '../renderer/interfaces/Light';
import { Renderer } from '../renderer/Renderer';

import { quat, vec3 } from 'gl-matrix';
import { range } from 'lodash';

const light1: Light = { lightPosition: [10, 10, 10], lightColor: [1, 1, 1], lightIntensity: 256 };
const light2: Light = { lightPosition: [700, 500, 50], lightColor: [3, 3, 3], lightIntensity: 100 };

const renderer: Renderer = new Renderer(800, 600, 2);

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 1: create geometry
///////////////////////////////////////////////////////////////////////////////////////////////////

// Add lights to the renderer
renderer.addLight(light1);
renderer.addLight(light2);

const vertices: vec3[] = [];
const normals: vec3[] = [];
const indices: number[] = [];
const colors: vec3[] = [];

const numLat = 20;
const numLong = 20;

// Generate the normals and vertices arrays
range(numLat + 1).forEach((lat: number) => {
    const theta = lat * Math.PI / numLat;

    range(numLong).forEach((long: number) => {
        const phi = long * 2 * Math.PI / numLong;
        const x = Math.cos(phi) * Math.sin(theta);
        const y = Math.cos(theta);
        const z = Math.sin(phi) * Math.sin(theta);

        normals.push(vec3.fromValues(x, y, z));
        vertices.push(vec3.fromValues(x, y, z));
        colors.push(vec3.fromValues(Math.random(), Math.random(), Math.random()));
    });
});

// Generate indices array
range(numLat - 1).forEach((lat: number) => {
    range(numLong).forEach((long: number) => {
        const topLeft = lat * numLong + long;
        const bottomLeft = topLeft + numLong;
        const topRight = ((lat + 1) % numLat) * numLong + (long + 1) % numLong;
        const bottomRight = topRight + numLong;

        indices.push(topLeft, bottomLeft, topRight);
        indices.push(bottomLeft, bottomRight, topRight);
    });
});

const sphere = { vertices, normals, indices, colors };

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 2: create armature
///////////////////////////////////////////////////////////////////////////////////////////////////

const bone = Armature.define((root: Node) => {
    root.createPoint('base', vec3.fromValues(0, 0, 0));
    root.createPoint('tip', vec3.fromValues(0, 1, 0));
});

const tower = bone();

let top = tower;
range(5).forEach(() => {
    const nextPiece = bone();
    nextPiece.point('base').stickTo(top.point('tip'));
    nextPiece.point('base').attach(sphere);
    nextPiece.setRotation(
        quat.fromEuler(quat.create(), Math.random() * 90 - 45, Math.random() * 90 - 45, 0)
    );

    top = nextPiece;
});

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 3: set up renderer
///////////////////////////////////////////////////////////////////////////////////////////////////

document.body.appendChild(renderer.stage);

renderer.camera.moveTo(vec3.fromValues(0, 0, 8));
renderer.camera.lookAt(vec3.fromValues(2, 2, -4));

// Draw the armature
let rotation = 0;
const draw = () => {
    rotation += 1;
    tower.setRotation(quat.fromEuler(quat.create(), 0, rotation, 0));
    renderer.draw([tower], { drawAxes: true, drawArmatureBones: true });
    window.requestAnimationFrame(draw);
};
draw();
