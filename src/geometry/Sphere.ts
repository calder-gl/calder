import { vec3 } from 'gl-matrix';
import { range } from 'lodash';

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
        vertices: vertices,
        normals: vertices,
        indices: range(vertices.length),
        colors: [] // colors are created by the caller
    };
}
