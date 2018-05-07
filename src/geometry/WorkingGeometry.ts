import { vec3 } from 'gl-matrix';

export type Face = {
    // The indices for the vertices representing the three points of this triangle/quad
    indices: number[];
    normal: vec3;
};

export type WorkingGeometry = {
    vertices: vec3[];
    faces: Face[];
    controlPoints: vec3[];
};
