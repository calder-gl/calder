import { mat4, quat, vec3, vec4 } from 'gl-matrix';
import { defaultMaterial, Bakeable, BakedGeometry, Material } from '../calder';
import { Affine } from '../utils/affine';

import { zip } from 'lodash';

/**
 * A representation of a surface on an object.
 */
export class Face {
    /**
     * References indices of vertices in a WorkingGeometry that make up a polygon. This polygon is
     * the object's surface. This should be of length 3 for a triangle or 4 or a quad.
     */
    public vertexIndices: number[];
    public normalIndices: number[];

    /**
     * @param {number[]} vertexIndices: Reference indices of vertices in a WorkingGeometry.
     * @param {number[]} normalIndices: Reference indices of vertices in a WorkingGeometry.
     * @return {Face}
     */
    constructor(vertexIndices: number[], normalIndices: number[]) {
        this.vertexIndices = vertexIndices;
        this.normalIndices = normalIndices;
    }
}

export type WorkingGeometryParams = {
    // The points that make up the geometry.
    vertices: vec3[];

    // The normals corresponding to the vertices.
    normals: vec3[];

    // The surfaces of the object, relating the vertices to each other.
    faces: Face[];

    // A set of points to snap to or reference.
    controlPoints: vec3[];

    // The material for this WorkingGeometry.
    material: Material;
};

/**
 * A representation of geometry while modelling is happening.
 */
export class WorkingGeometry implements Bakeable {
    /**
     * The points that make up the geometry, in no particular order. For each vertex v, v[3] must
     * be equal to 0 to ensure that it is a point in Affine space rather than a vector.
     *
     * For faceted objects, a vertex is needed for every facet it touches.
     *
     */
    public vertices: vec4[];

    /**
     * The normals that correspond to the vertices. For each normal n, n[3] must be equal to 1 to
     * ensure that it is a vector.
     */
    public normals: vec4[];

    /**
     * The surfaces of the object. Each face includes the indices of the vertices and normals that
     * make up the surface's polygon. Note that vertices and normals use the same buffer.
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
     * The material for this WorkingGeometry.
     */
    private material: Material;

    /**
     * If the instance is mutated, perform work to compute the new baked representation.
     */
    private updateCache: boolean;

    /**
     * A memoized `BakedGeometry` representation of the instance.
     */
    private bakedRepresentation: BakedGeometry;

    /**
     * Creates a working geometry from a given set of vertices, faces, and control points.
     *
     * @param {WorkingGeometryParams} params: Parameters for creating a `WorkingGeometry`.
     * @return {WorkingGeometry}
     */
    constructor(
        params: WorkingGeometryParams = {
            vertices: [],
            normals: [],
            faces: [],
            controlPoints: [],
            material: defaultMaterial
        }
    ) {
        // TODO(pbardea): Check if max(indices) of all faces is <= the len(vertices)
        this.vertices = params.vertices.map(Affine.createPoint);
        this.normals = params.normals.map(Affine.createVector);
        this.faces = params.faces;
        this.controlPoints = params.controlPoints.map(Affine.createPoint);
        this.mergedObjects = [];
        this.material = params.material;
        this.updateCache = true;
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
        if (this.updateCache) {
            this.combine();

            const vertexNormalPairs: {[pair: string]: number} = {};

            const min = vec4.fromValues(Infinity, Infinity, Infinity, 1);
            const max = vec4.fromValues(-Infinity, -Infinity, -Infinity, 1);
            this.vertices.forEach((vertex: vec4) => {
                min[0] = Math.min(min[0], vertex[0]);
                min[1] = Math.min(min[1], vertex[1]);
                min[2] = Math.min(min[2], vertex[2]);

                max[0] = Math.max(max[0], vertex[0]);
                max[1] = Math.max(max[1], vertex[1]);
                max[2] = Math.max(max[2], vertex[2]);
            });

            const bakedVertices: number[] = [];
            const bakedNormals: number[] = [];
            const bakedIndices: number[] = [];
            let nextNewIndex = 0;

            this.faces.forEach((face: Face) => {
                zip(face.vertexIndices, face.normalIndices).forEach(([vertexIndex, normalIndex]: [number | undefined, number | undefined]) => {
                    if (vertexIndex === undefined || normalIndex === undefined) {
                        throw new Error('Mismatched normals and vertices found');
                    }
                    if (vertexIndex >= this.vertices.length) {
                        throw new Error(`Vertex index ${vertexIndex} can't be found.`);
                    }
                    if (normalIndex >= this.normals.length) {
                        throw new Error(`Vertex normal index ${normalIndex} can't be found.`);
                    }

                    const vertexNormalPair = `${vertexIndex},${normalIndex}`;
                    if (vertexNormalPairs[vertexNormalPair] !== undefined) {
                        bakedIndices.push(vertexNormalPairs[vertexNormalPair]);
                    } else {
                        bakedIndices.push(nextNewIndex);
                        vertexNormalPairs[vertexNormalPair] = nextNewIndex;
                        nextNewIndex += 1;

                        const vertex = this.vertices[vertexIndex];
                        const normal = this.normals[normalIndex];
                        bakedVertices.push(vertex[0], vertex[1], vertex[2]);
                        bakedNormals.push(normal[0], normal[1], normal[2]);
                    }
                });
            });

            this.bakedRepresentation = {
                vertices: Float32Array.from(bakedVertices),
                normals: Float32Array.from(bakedNormals),
                indices: Int16Array.from(bakedIndices),
                material: this.material.bake(),
                aabb: { min, max }
            };

            this.updateCache = false;
        }

        return this.bakedRepresentation;
    }

    /**
     * Translate.
     *
     * @param {vec3} v: translation vector.
     */
    public translate(v: vec3) {
        const translationMatrix: mat4 = mat4.fromTranslation(mat4.create(), v);
        this.transform(translationMatrix);
    }

    /**
     * Rotate.
     *
     * @param {vec3} axis: axis of rotation.
     * @param {number} angle: amount to rotate in radians.
     * @param {vec3} holdPoint: point to rotate from, default to true origin.
     */
    public rotate(axis: vec3, angle: number, holdPoint: vec3 = vec3.create()) {
        const normalAxis = vec3.normalize(vec3.create(), axis);
        const quaternion = quat.setAxisAngle(quat.create(), normalAxis, angle);
        const rotationMatrix: mat4 = mat4.fromRotationTranslationScaleOrigin(
            mat4.create(),
            quaternion,
            vec3.create(),
            vec3.fromValues(1, 1, 1),
            holdPoint
        );
        this.transform(rotationMatrix);
    }

    /**
     * Scale by pulling a point to a new point.
     *
     * @param {vec3} pullPoint: point that scales to destinationPoint after transformation.
     * @param {vec3} destinationPoint: point that is the result of pullPoint after transformation.
     * @param {vec3} holdPoint: point to scale from, default to true origin.
     */
    public freeformStretchTo(
        pullPoint: vec3,
        destinationPoint: vec3,
        holdPoint: vec3 = vec3.create()
    ) {
        const moveHoldToOrigin = mat4.translate(
            mat4.create(),
            mat4.create(),
            vec3.negate(vec3.create(), holdPoint)
        );
        this.transform(moveHoldToOrigin);

        const translatedPullPoint = vec3.sub(vec3.create(), pullPoint, holdPoint);
        const translatedDestinationPoint = vec3.sub(vec3.create(), destinationPoint, holdPoint);

        this.freeformStretch(
            translatedPullPoint,
            translatedDestinationPoint,
            vec3.len(translatedDestinationPoint) / vec3.len(translatedPullPoint)
        );

        const moveOriginToHold = mat4.translate(mat4.create(), mat4.create(), holdPoint);
        this.transform(moveOriginToHold);
    }

    /**
     * Scale by pulling a point away from a hold point by a provided factor.
     *
     * @param {number} factor: scaling factor away from holdPoint.
     * @param {vec3} pullPoint: point that scales to destinationPoint after transformation.
     * @param {vec3} holdPoint: point to scale from, default to true origin.
     */
    public freeformStretchByFactor(
        factor: number,
        pullPoint: vec3,
        holdPoint: vec3 = vec3.create()
    ) {
        const moveHoldToOrigin = mat4.translate(
            mat4.create(),
            mat4.create(),
            vec3.negate(vec3.create(), holdPoint)
        );
        this.transform(moveHoldToOrigin);

        const translatedPullPoint = vec3.sub(vec3.create(), pullPoint, holdPoint);

        this.freeformStretch(translatedPullPoint, translatedPullPoint, factor);

        const moveOriginToHold = mat4.translate(mat4.create(), mat4.create(), holdPoint);
        this.transform(moveOriginToHold);
    }

    /**
     * Uniformly scale by a given factor away from a given point.
     *
     * @param {number} factor: scaling factor.
     * @param {vec3} holdPoint: point to scale from, default to true origin.
     */
    public proportionalStretchByFactor(factor: number, holdPoint: vec3 = vec3.create()) {
        const factorVector: vec3 = vec3.fromValues(factor, factor, factor);
        const scalingMatrix: mat4 = mat4.fromRotationTranslationScaleOrigin(
            mat4.create(),
            quat.create(),
            vec3.create(),
            factorVector,
            holdPoint
        );
        this.transform(scalingMatrix);
    }

    /**
     * Sets the fill of the `WorkingGeometry` to a given material.
     *
     * @class WorkingGeometry
     * @method setFill
     * @param {Material} material The new material for the geometry.
     */
    public setFill(material: Material) {
        this.updateCache = true;
        this.material = material;
    }

    /**
     * Merge the child objects into the current one by updating the current vertices, faces, and
     * control points.
     */
    protected combine() {
        this.updateCache = true;

        this.mergedObjects.forEach((child: WorkingGeometry) => {
            child.combine();
        });
        let vertexCount = this.vertices.length;
        let normalCount = this.normals.length;
        for (const child of this.mergedObjects) {
            this.vertices = this.vertices.concat(child.vertices);
            this.normals = this.normals.concat(child.normals);
            child.faces.forEach((face: Face) => {
                face.vertexIndices = face.vertexIndices.map((i: number) => i + vertexCount);
                face.normalIndices = face.normalIndices.map((i: number) => i + normalCount);
            });
            this.faces = this.faces.concat(child.faces);
            this.controlPoints = this.controlPoints.concat(child.controlPoints);
            vertexCount += child.vertices.length;
            normalCount += child.normals.length;
        }
    }

    /**
     * Iteratively perform transforms on all vertices.
     *
     * @param {mat4} matrix: Transformation matrix.
     */
    private transform(matrix: mat4) {
        this.updateCache = true;

        this.vertices = this.vertices.map((workingVec: vec4) =>
            vec4.transformMat4(vec4.create(), workingVec, matrix)
        );
        const inv = mat4.invert(mat4.create(), matrix);
        if (inv === null) {
            throw new Error('Uninvertible transformation matrix');
        }
        const normalMat = mat4.transpose(mat4.create(), inv);
        this.normals = this.normals.map((workingVec: vec4) =>
            vec4.transformMat4(vec4.create(), workingVec, normalMat)
        );
    }

    /**
     * Stretch from the pull point to the destination direction by the given
     * factor, while allowing shearing.
     *
     * @param {vec3} pullPoint: the point being pulled away from the origin.
     * @param {number} destDir: the direction away from the origin that
     * pullPoint is being pulled to.
     * @param {vec3} factor: the scaling factor.
     */
    private freeformStretch(pullPoint: vec3, destDir: vec3, factor: number) {
        const rotPullToXAxis = mat4.fromQuat(
            mat4.create(),
            quat.rotationTo(
                quat.create(),
                vec3.normalize(vec3.create(), pullPoint),
                vec3.fromValues(1, 0, 0)
            )
        );

        const scalePullByFactorOnXAxis = mat4.scale(
            mat4.create(),
            mat4.create(),
            vec3.fromValues(factor, 1, 1)
        );

        const rotXAxisToDestAxis = mat4.fromQuat(
            mat4.create(),
            quat.rotationTo(
                quat.create(),
                vec3.fromValues(1, 0, 0),
                vec3.normalize(vec3.create(), destDir)
            )
        );

        // Assemble all the matrices!
        const matrix = rotXAxisToDestAxis;
        mat4.mul(matrix, matrix, scalePullByFactorOnXAxis);
        mat4.mul(matrix, matrix, rotPullToXAxis);

        this.transform(matrix);
    }
}
