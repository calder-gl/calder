import { range } from 'lodash';
import { vec3 } from 'gl-matrix';

import { BakedGeometry } from './BakedGeometry';
import { ScalarField } from './ScalarField';
import { genIsoSurface } from './MarchingCubes';

const Radius = 1;
const Dim = 25;
const Length = 2.5;

function sphereSignedDistFunc(coord: vec3): number {
    return Math.sqrt(coord[0] * coord[0] + coord[1] * coord[1] + coord[2] * coord[2]) - Radius;
}

// TODO(abhimadan): Create WorkingGeometry here instead
export function genSphere(): BakedGeometry {
    const sphere = new ScalarField(Dim, Length, sphereSignedDistFunc);
    const vertices = genIsoSurface(sphere);
    return {
        vertices: vertices,
        normals: vertices,
        indices: range(vertices.length),
        colors: [] // colors are created by the caller
    };
}
