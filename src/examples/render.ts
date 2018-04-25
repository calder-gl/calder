import { Renderer } from '../renderer/Renderer';

import { mat4 } from 'gl-matrix';
import { range } from 'lodash';

const renderer = new Renderer(800, 600);
document.body.appendChild(renderer.stage);

const transform = mat4.create();
mat4.translate(transform, transform, [0, 0, -8]);
const vertices: number[] = [];
const normals: number[] = [];
const indices: number[] = [];

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

const colors = vertices.map(() => [1, 0, 0]);

renderer.draw([{
    transform,
    vertices,
    normals,
    colors,
    indices,
}]);
