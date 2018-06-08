import { vec3 } from 'gl-matrix';
import { flatMap, range } from 'lodash';

import { BakedGeometry } from './BakedGeometry';
import { genIsoSurface } from './MarchingCubes';
import { ScalarField } from './ScalarField';

const RADIUS = 1;
const DIM = 25;
const LENGTH = 2.5;

function sphereSignedDistFunc(coord: vec3): number {
    return Math.sqrt(coord[0] * coord[0] + coord[1] * coord[1] + coord[2] * coord[2]) - RADIUS;
}

// TODO(abhimadan): Create WorkingGeometry here instead
export function genSphere(): BakedGeometry {
    const sphere = new ScalarField(DIM, LENGTH, sphereSignedDistFunc);
    const vertices = genIsoSurface(sphere);

    return {
        vertices: Float32Array.from(flatMap(vertices, (v: vec3) => [v[0], v[1], v[2]])),
        normals: Float32Array.from(flatMap(vertices, (v: vec3) => [v[0], v[1], v[2]])),
        indices: Int16Array.from(range(vertices.length)),
        colors: Float32Array.from([]) // colors are created by the caller
    };
}
