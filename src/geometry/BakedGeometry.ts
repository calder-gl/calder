import { vec3 } from 'gl-matrix';

export type BakedGeometry = {
    vertices: vec3[];
    normals: vec3[];
    indices: number[];
};
