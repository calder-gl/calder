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
     * @param {number[]} indices: Reference indeces of vertices in a WorkingGeometry.
     * @param {vec4} normal: A fector representing the direction out of the face.
     * @return {Face}
     */
    constructor(indices: number[]) {
        // TODO(pbardea): Verify length of indices here.
        this.indices = indices;
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
     * A set of merged objects which are only collapsed into the parent object during baking.
     */
    private mergedObjects: WorkingGeometry[];

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
        this.mergedObjects = [];
    }

    /**
     * Merge a WorkingGeometry into the current one.
     *
     * @param {WorkingGeometry} child: The geometry to be merged.
     */
    public merge(child: WorkingGeometry) {
        this.mergedObjects.push(child);
    }

    /**
     * Return the BakedGeometry representing the current state of the WorkingGeomtry.
     *
     * @returns {BakedGeometry}
     */
    public bake(): BakedGeometry {
        this.combine();

        const bakedVertices = this.vertices.map((workingVec: vec4) =>
            vec3.fromValues(workingVec[0], workingVec[1], workingVec[2])
        );
        const bakedIndecies = this.faces.reduce((accum: number[], face: Face) => {
            return accum.concat(face.indices);
        }, []);
        const bakedNormals = this.faces.map((face: Face) => {
            const p1: vec4 = this.vertices[face.indices[0]];
            const p2: vec4 = this.vertices[face.indices[1]];
            const p3: vec4 = this.vertices[face.indices[2]];
            const v1: vec3 = Affine.to3D(vec4.subtract(vec4.create(), p1, p2));
            const v2: vec3 = Affine.to3D(vec4.subtract(vec4.create(), p2, p3));

            return vec3.cross(vec3.create(), v1, v2);
        });

        // Make all of the baked shapes red for now
        const bakedColors: vec3[] = bakedVertices.map(() => vec3.fromValues(1, 0, 0));

        return {
            vertices: bakedVertices,
            normals: bakedNormals,
            indices: bakedIndecies,
            colors: bakedColors
        };
    }

    /**
     * Merge the child objects into the current one by updating the current vertices, faces, and
     * control points.
     */
    protected combine() {
        this.mergedObjects.forEach((child: WorkingGeometry) => {
            child.combine();
        });
        let vertexCount = this.vertices.length;
        for (const child of this.mergedObjects) {
            this.vertices = this.vertices.concat(child.vertices);
            child.faces.forEach((face: Face) => {
                const newIndices = face.indices.map((i: number) => i + vertexCount);
                face.indices = newIndices;
            });
            this.faces = this.faces.concat(child.faces);
            this.controlPoints = this.controlPoints.concat(child.controlPoints);
            vertexCount += child.vertices.length;
        }
    }
}
