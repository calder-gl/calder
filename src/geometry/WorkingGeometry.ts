import { vec3, vec4 } from 'gl-matrix';
import { Affine } from '../utils/affine';
import { BakedGeometry } from './BakedGeometry';

/**
 * A representation of a surface on an object.
 */
export class Face {
    /**
     * References indices of vertices in a WorkingGeometry that make up a polygon. This polygon is
     * the object's surface. This should be of length 3 for a triangle or 4 or a quad.
     */
    public indices: number[];

    /**
     * A vector representing the direction out of the front of the face. The normal n should have
     * n[3] = 1 to ensure that it is a vector in Affine space.
     */
    public normal: vec4;

    /**
     * @param {number[]} indices: Reference indeces of vertices in a WorkingGeometry.
     * @param {vec4} normal: A fector representing the direction out of the face.
     * @return {Face}
     */
    constructor(indices: number[], normal: vec3) {
        // TODO(pbardea): Verify length of indices here.
        this.indices = indices;
        this.normal = Affine.createVector(normal);
    }
}

/**
 * A representation of geometry while modelling is happening.
 */
export class WorkingGeometry {
    /**
     * The points that make up the geometry, in no particular order. For each vertex v, v[3] must
     * be equal to 0 to ensure that it is a point in Affine space rather than a vector.
     */
    public vertices: vec4[];

    /**
     * The surfaces of the object. Each face includes the indices of the vertices that make up the
     * surface's polygon.
     */
    public faces: Face[];

    /**
     * A set of points to snap to or reference when combining geometries. For each point p, p[3]
     * must be equal to 0 to ensure that it is a point in Affine space.
     */
    public controlPoints: vec4[];

    /**
     * Creates a working geometry from a given set of vertices, faces, and control points.
     *
     * @param {vec3[]} vertices: The points that make up the geometry.
     * @param {Face[]} faces: The surfaces of the object, relating the vertices to eachother.
     * @param {vec3[]} controlPoints: A set of points to snap to or reference.
     * @return {WorkingGeometry}
     */
    constructor(vertices: vec3[] = [], faces: Face[] = [], controlPoints: vec3[] = []) {
        // TODO(pbardea): Check if max(indecies) of all faces is <= the len(vertices)
        this.vertices = vertices.map(Affine.createPoint);
        this.faces = faces;
        this.controlPoints = controlPoints.map(Affine.createPoint);
    }

    /**
     * Return the BakedGeometry representing the current state of the WorkingGeomtry.
     *
     * @returns {BakedGeometry}
     */
    public bake(): BakedGeometry {
        const bakedVertices = this.vertices.map((workingVec: vec4) =>
            vec3.fromValues(workingVec[0], workingVec[1], workingVec[2])
        );
        const bakedIndecies = this.faces.reduce((accum: number[], face: Face) => {
            return accum.concat(face.indices);
        }, []);
        const bakedNormals = this.faces.map((face: Face) => {
            return vec3.fromValues(face.normal[0], face.normal[1], face.normal[2]);
        });

        // Make all of the baked shapes red for now.
        const bakedColors: vec3[] = bakedVertices.map(() => vec3.fromValues(1, 0, 0));

        return {
            vertices: bakedVertices,
            normals: bakedNormals,
            indices: bakedIndecies,
            colors: bakedColors
        };
    }
}
