import { vec3 } from 'gl-matrix';

/**
 * After modelling is complete, a BakedGeometry should be returned for use in the renderer.
 */
export type BakedGeometry = {
    vertices: vec3[];
    normals: vec3[];
    indices: number[];
};
