import { Renderer } from '../renderer/Renderer';

import { mat4, vec3 } from 'gl-matrix';
import { flatMap, range } from 'lodash';

const renderer = new Renderer(800, 600);

const transform = mat4.fromTranslation(mat4.create(), [0, 0, -4]);
const vertices: number[] = [];
const normals: number[] = [];
const indices: number[] = [];
const colors: number[] = [];

const numLat = 20;
const numLong = 20;

range(numLat).forEach((lat: number) => {
    const theta = lat * Math.PI / numLat;

    range(numLong).forEach((long: number) => {
        const phi = long * 2 * Math.PI / numLong;
        const x = Math.cos(phi) * Math.sin(theta);
        const y = Math.cos(theta);
        const z = Math.sin(phi) * Math.sin(theta);

        normals.push(x, y, z);
        vertices.push(x, y, z);
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

colors.push(...flatMap(vertices, () => [1, 0, 0]));

document.body.appendChild(renderer.stage);

renderer.camera.moveTo(vec3.fromValues(0, 0, 4));
renderer.camera.lookAt(vec3.fromValues(2, 0, -4));
renderer.draw(
    [
        {
            transform,
            vertices,
            normals,
            colors,
            indices
        }
    ],
    true
);
