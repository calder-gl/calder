import { mat4, quat, vec3, vec4 } from 'gl-matrix';
import { Affine } from '../utils/affine';
import { BakedGeometry } from './BakedGeometry';

import { flatten } from 'lodash';

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
     * @param {number[]} indices: Reference indices of vertices in a WorkingGeometry.
     * @return {Face}
     */
    constructor(indices: number[]) {
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
     * Creates a working geometry from a given set of vertices, faces, and control points.
     *
     * @param {vec3[]} vertices: The points that make up the geometry.
     * @param {vec3[]} normals: The normals corresponding to the vertices.
     * @param {Face[]} faces: The surfaces of the object, relating the vertices to each other.
     * @param {vec3[]} controlPoints: A set of points to snap to or reference.
     * @return {WorkingGeometry}
     */
    constructor(
        vertices: vec3[] = [],
        normals: vec3[] = [],
        faces: Face[] = [],
        controlPoints: vec3[] = []
    ) {
        // TODO(pbardea): Check if max(indices) of all faces is <= the len(vertices)
        this.vertices = vertices.map(Affine.createPoint);
        this.normals = normals.map(Affine.createVector);
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

        const bakedVertices = this.vertices.map((workingVec: vec4) => [
            workingVec[0],
            workingVec[1],
            workingVec[2]
        ]);
        const bakedIndices = this.faces.reduce((accum: number[], face: Face) => {
            return accum.concat(face.indices);
        }, []);
        const bakedNormals = this.normals.map((workingVec: vec4) => [
            workingVec[0],
            workingVec[1],
            workingVec[2]
        ]);

        // Make all of the baked shapes red for now.
        const bakedColors = bakedVertices.map(() => [1, 0, 0]);

        return {
            vertices: Float32Array.from(flatten(bakedVertices)),
            normals: Float32Array.from(flatten(bakedNormals)),
            indices: Int16Array.from(bakedIndices),
            colors: Float32Array.from(flatten(bakedColors))
        };
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
    public scale(pullPoint: vec3, destinationPoint: vec3, holdPoint: vec3 = vec3.create()) {
        const moveHoldToOrigin = mat4.translate(
            mat4.create(),
            mat4.create(),
            vec3.negate(vec3.create(), holdPoint)
        );

        const translatedPullPoint = vec3.sub(vec3.create(), pullPoint, holdPoint);
        const translatedDestinationPoint = vec3.sub(vec3.create(), destinationPoint, holdPoint);

        const rotPullToXAxis = mat4.fromQuat(
            mat4.create(),
            quat.rotationTo(
                quat.create(),
                vec3.normalize(vec3.create(), translatedPullPoint),
                vec3.fromValues(1, 0, 0)
            )
        );

        const scalePullToDestOnXAxis = mat4.scale(
            mat4.create(),
            mat4.create(),
            vec3.fromValues(
                vec3.len(translatedDestinationPoint) / vec3.len(translatedPullPoint),
                1,
                1
            )
        );

        const rotXAxisToDestAxis = mat4.fromQuat(
            mat4.create(),
            quat.rotationTo(
                quat.create(),
                vec3.fromValues(1, 0, 0),
                vec3.normalize(vec3.create(), translatedDestinationPoint)
            )
        );

        const moveOriginToHold = mat4.translate(mat4.create(), mat4.create(), holdPoint);

        // Assemble all the matrices!
        let matrix = moveOriginToHold;
        mat4.mul(matrix, matrix, rotXAxisToDestAxis);
        mat4.mul(matrix, matrix, scalePullToDestOnXAxis);
        mat4.mul(matrix, matrix, rotPullToXAxis);
        mat4.mul(matrix, matrix, moveHoldToOrigin);

        this.transform(matrix);
    }

    /**
     * Scale by a given factor between 2 points.
     *
     * @param {number} factor: scaling factor.
     * @param {vec3} pullPoint: point that will be scaled by factor away from holdPoint.
     * @param {vec3} holdPoint: point to scale from, default to true origin.
     */
    public scaleByFactor(factor: number, pullPoint: vec3, holdPoint: vec3 = vec3.create()) {
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
            this.normals = this.normals.concat(child.normals);
            child.faces.forEach((face: Face) => {
                const newIndices = face.indices.map((i: number) => i + vertexCount);
                face.indices = newIndices;
            });
            this.faces = this.faces.concat(child.faces);
            this.controlPoints = this.controlPoints.concat(child.controlPoints);
            vertexCount += child.vertices.length;
        }
    }

    /**
     * Special divide for scaling vectors. Treats undeterminate as 1.
     *
     * @param {number} a: Numerator.
     * @param {number} b: Denominator.
     * @return {number}: Result of division.
     */
    private scalingDivide(a: number, b: number): number {
        if (b === 0 && a === 0) {
            return 1;
        } else if (b === 0 || a === 0) {
            // TODO: Handle skew case here. Should not return NaN.
            //       This should also never be run since call site checks
            //       that vectors are in the same direction.
            return NaN;
        } else {
            return a / b;
        }
    }

    /**
     * Determines if 2 vectors are pointing in the same direction.
     *
     * @param {vec3} a: The first vector.
     * @param {vec3} b: The second vector.
     * @return {boolean}: Whether the 2 vectors are in the same direction.
     */
    private areSameDirection(a: vec3, b: vec3): boolean {
        const base: vec3 = vec3.normalize(vec3.create(), b);
        const positiveNorm: vec3 = vec3.normalize(vec3.create(), a);
        const negativeNorm: vec3 = vec3.normalize(vec3.create(), vec3.scale(vec3.create(), a, -1));

        return vec3.equals(positiveNorm, base) || vec3.equals(negativeNorm, base);
    }

    /**
     * Computes scaling vector by dividing destination by pull vectors using
     * special division.
     *
     * @param {vec3} destination: Destination point of scaling.
     * @param {vec3} pull: Starting pull point of scaling.
     * @return {vec3}: Scaling vector.
     * @throws {Error}: If the destination and pull vectors are not in the same direction.
     */
    private getScalingVector(destination: vec3, pull: vec3): vec3 {
        if (!this.areSameDirection(destination, pull)) {
            // TODO: Add the vector values in the error, but the test needs to be updated to a regex.
            throw new Error('Destination and pull vectors must be in the same direction.');
        }
        const x: number = this.scalingDivide(destination[0], pull[0]);
        const y: number = this.scalingDivide(destination[1], pull[1]);
        const z: number = this.scalingDivide(destination[2], pull[2]);

        return vec3.fromValues(x, y, z);
    }

    /**
     * Iteratively perform transforms on all vertices.
     *
     * @param {mat4} matrix: transformation matrix.
     */
    private transform(matrix: mat4) {
        this.vertices = this.vertices.map((workingVec: vec4) =>
            vec4.transformMat4(vec4.create(), workingVec, matrix)
        );
        let inv = mat4.invert(mat4.create(), matrix);
        if (inv === null) {
            throw new Error('Uninvertible transformation matrix');
        }
        let normalMat = mat4.transpose(mat4.create(), inv);
        this.normals = this.normals.map((workingVec: vec4) =>
            vec4.transformMat4(vec4.create(), workingVec, normalMat)
        );
    }
}
