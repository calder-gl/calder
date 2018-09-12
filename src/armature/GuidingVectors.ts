import { coord } from '../calder';
import { vec3From4 } from '../math/utils';
import { Mapper } from '../utils/mapper';
import { worldSpaceVectors } from '../utils/vectors';
import { Cost, CostFn, Generator, GeneratorInstance, SpawnPoint } from './Generator';
import { Node } from './Node';

import 'bezier-js';
import { vec3, vec4 } from 'gl-matrix';
import { minBy, range } from 'lodash';

type Closest = {
    curve: GuidingCurve;
    point: BezierJs.Projection;
    guidingVector: vec3;
};

/**
 * A DistanceMultiplier adds cost for added bones that are farther away from a guiding curve. For
 * a multiplier m, the distance cost is the sum of m[i] * distance^i, for i in [0, 2]. That is to
 * say, m[0] adds a constant offset, m[1] is a linear multiplier, and m[2] is quadratic.
 */
export type DistanceMultiplier = [number, number, number];

/**
 * A representation of a guiding curve, which is a Bezier path, and multipliers affecting the cost
 * around the curve.
 *
 * Alignment is used to incentivize adding placing structure pointing in the same direction as
 * guiding curves, whereas distance is used to penalize structure that veers too far from the
 * curves. Multipliers and offsets should be chosen to achieve a balance of allowing shapes to
 * still be placed, but with high enough costs that shapes are only placed if they are "good".
 */
export type GuidingCurve = {
    /**
     * The guiding curve.
     */
    bezier: BezierJs.Bezier;

    /**
     * A multiplier that adds cost the father from the curve you go.
     */
    distanceMultiplier: DistanceMultiplier;

    /**
     * A multiplier that scales the cost associated with the alignment of placed structure relative
     * to the guiding vector field.
     */
    alignmentMultiplier: number;

    /**
     * A number in [-1, 1] representing how aligned added structure needs to be with the vector field
     * for it to receive a negative cost (that is to say, there is incentive to add it.)
     *
     * Structure perfectly aligned with the vector field has a raw alignment cost of -1. If it is
     * perpendicular, the cost is 0. If it is exactly the opposite direction, it has a cost of 1.
     *
     * A positive offset therefore means structure needs to be **more aligned** in order to be
     * incentivized (the higher the offset, the closer it has to be to perfect alignment).
     *
     * A negative negative offset means that alignment is more lenient and is incentivized even if
     * structure is facing away from the vector field. This can be useful if adding *any* new
     * structure should be incentivized over only adding well-aligned structure.
     */
    alignmentOffset: number;
};

/**
 * A cost function that doesn't look at the geometry of a model, only the shape, by comparing
 * the angles in the skeleton to guiding vectors.
 */
export class GuidingVectors implements CostFn {
    public static NONE: DistanceMultiplier = [0, 0, 0];
    public static LINEAR: DistanceMultiplier = [0, 100, 0];
    public static QUADRATIC: DistanceMultiplier = [0, 0, 100];

    private vectors: GuidingCurve[];
    private nodeLocations: Map<Node, vec4> = new Map<Node, vec4>();
    private expectedVectors: Map<string, vec4> = new Map<string, vec4>();
    private spawnPointVectors: Map<SpawnPoint, vec4> = new Map<SpawnPoint, vec4>();

    /**
     * @param {BezierJs.Bezier[]} guidingVectors The Bezier paths that will be used to guide the
     * growth of the procedural shape.
     */
    constructor(guidingVectors: GuidingCurve[]) {
        this.vectors = guidingVectors;
    }

    /**
     * For debugging/visualization purposes, generates a buffer that is used to render lines in
     * the vector field.
     *
     * @param {number} radius To what distance from the origin field lines should be generated for
     * @param {number} step The space between field lines
     * @returns {Float32Array} A buffer of vertices for the vector field lines.
     */
    public generateVectorField(radius: number = 3, step: number = 0.5): Float32Array {
        const field: number[] = [];

        range(-radius, radius, step).forEach((x: number) => {
            range(-radius, radius, step).forEach((y: number) => {
                range(-radius, radius, step).forEach((z: number) => {
                    // Add first point
                    field.push(x, y, z);

                    const closest = this.closest(vec4.fromValues(x, y, z, 1));

                    // Make the vector as long as step/2
                    closest.guidingVector[0] *= step / 2;
                    closest.guidingVector[1] *= step / 2;
                    closest.guidingVector[2] *= step / 2;

                    // Add second point: original point plus vector
                    field.push(
                        x + closest.guidingVector[0],
                        y + closest.guidingVector[1],
                        z + closest.guidingVector[2]
                    );
                });
            });
        });

        return Float32Array.from(field);
    }

    /**
     * For each target curve, creates a vertex buffer of points along the curve.
     *
     * @returns {Float32Array[]} A vertex buffer for each curve.
     */
    public generateGuidingCurve(): Float32Array[] {
        return this.vectors.map((c: GuidingCurve) => {
            const curve: number[] = [];

            c.bezier.getLUT().forEach((p: BezierJs.Point) => {
                curve.push(p.x, p.y, (<coord>p).z);
            });

            return Float32Array.from(curve);
        });
    }

    public getCost(instance: GeneratorInstance, added: Node[]): Cost {
        // Out of the added nodes, just get the structure nodes
        const addedStructure: Node[] = [];
        added.forEach((n: Node) =>
            n.structureCallback((node: Node) => {
                addedStructure.push(node);
            })
        );

        let totalCost = instance.getCost().realCost;
        let lastClosest: Closest | null = null;
        let lastLocation: vec3 | null = null;

        // For each added shape and each influence point, add the resulting cost to the
        // instance's existing cost.
        addedStructure.forEach((node: Node) => {
            const localToGlobalTransform = node.localToGlobalTransform();

            // Get the location for the current node
            const globalPosition = vec4.transformMat4(
                vec4.create(),
                vec4.fromValues(0, 0, 0, 1),
                localToGlobalTransform
            );
            this.nodeLocations.set(node, globalPosition);
            lastLocation = vec3From4(globalPosition);

            // If the node has a parent that isn't yet in the cache, add it
            if (node.parent !== null && !this.nodeLocations.has(node.parent)) {
                const parentLocalToGlobalTransform = node.parent.localToGlobalTransform();
                const parentGlobalPosition = vec4.transformMat4(
                    vec4.create(),
                    vec4.fromValues(0, 0, 0, 1),
                    parentLocalToGlobalTransform
                );
                this.nodeLocations.set(node.parent, parentGlobalPosition);
            }

            const parentPosition =
                node.parent === null
                    ? vec4.fromValues(0, 0, 0, 1)
                    : <vec4>this.nodeLocations.get(node.parent);

            // Get the vector between the parent position and the current position
            const vector = vec4.sub(vec4.create(), globalPosition, parentPosition);
            vec4.normalize(vector, vector);

            // Find the closest point on a guiding curve
            const closest = this.closest(parentPosition);
            lastClosest = closest;

            totalCost += this.computeCost(closest, vector, vec3From4(parentPosition));
        });

        let heuristicCost = 0;
        if (lastClosest !== null) {
            instance.getSpawnPoints().forEach((spawnPoint: SpawnPoint) => {
                heuristicCost += this.computeCost(
                    // TODO(davepagurek): Maybe compute and cache the actual closest curve
                    <Closest>lastClosest,
                    this.getOrCreateSpawnPointVector(instance.generator, spawnPoint),
                    <vec3>lastLocation
                );
            });
        }

        return { realCost: totalCost, heuristicCost };
    }

    /**
     * Computes the cost for a given piece of added structure.
     *
     * @param {Closest} closest Information about the curve closest to the base of the parent.
     * @param {vec4} added The direction vector for the added structure.
     * @param {vec3} parentPosition The position of the parent that the added structure was
     * attached to.
     * @returns {number} The cost, given the above.
     */
    private computeCost(closest: Closest, added: vec4, parentPosition: vec3): number {
        const distance = vec3.distance(Mapper.coordToVector(<coord>closest.point), parentPosition);

        // Evaluate distance cost polynomial using Horner's method
        let distanceCost = 0;
        for (let power = 2; power >= 0; power -= 1) {
            distanceCost = closest.curve.distanceMultiplier[power] + distanceCost * distance;
        }

        // Add cost for vector alignment
        const alignmentCost =
            (-vec3.dot(closest.guidingVector, vec3From4(added)) + closest.curve.alignmentOffset) *
            closest.curve.alignmentMultiplier;

        return alignmentCost + distanceCost;
    }

    /**
     * Given a spawn point and a generator, computes the average direction vector coming from that
     * spawn point.
     */
    private getOrCreateSpawnPointVector(generator: Generator, spawnPoint: SpawnPoint): vec4 {
        let vector = this.spawnPointVectors.get(spawnPoint);

        if (vector === undefined) {
            const expectedVector = this.getOrCreateExpectedVector(generator, spawnPoint.component);
            const localToGlobalTransform = spawnPoint.at.node.localToGlobalTransform();
            vector = vec4.transformMat4(vec4.create(), expectedVector, localToGlobalTransform);

            // To avoid doing a matrix multiplication to orient the direction vector for a component
            // to the spawn point for every spawn point for every frame, save the value
            this.spawnPointVectors.set(spawnPoint, vector);
        }

        return vector;
    }

    /**
     * Create an average direction vector that will be generated by a component.
     */
    private getOrCreateExpectedVector(generator: Generator, component: string): vec4 {
        let vector = this.expectedVectors.get(component);

        if (vector === undefined) {
            vector = vec4.fromValues(0, 0, 0, 0);

            // Generate structure four times starting from the given component
            let totalSamples = 0;
            range(4).forEach(() => {
                worldSpaceVectors(generator, component).forEach((sample: vec4) => {
                    vec4.add(<vec4>vector, <vec4>vector, sample);
                    totalSamples += 1;
                });
            });

            // Average by the total number of samples
            if (totalSamples > 0) {
                vec4.scale(vector, vector, 1 / totalSamples);
            }

            this.expectedVectors.set(component, vector);
        }

        return vector;
    }

    /**
     * Returns the closest point on any of the target curves to an input point.
     */
    private closest(point: vec4): Closest {
        type PartialClosest = {
            curve: GuidingCurve;
            point: BezierJs.Projection;
        };

        const closestPoint = <PartialClosest>minBy(
            this.vectors.map((c: GuidingCurve) => {
                return {
                    curve: c,
                    point: c.bezier.project(Mapper.vectorToCoord(vec3From4(point)))
                };
            }),
            (c: PartialClosest) => c.point.d
        );

        const guidingVector = Mapper.coordToVector(<coord>closestPoint.curve.bezier.derivative(
            <number>closestPoint.point.t
        ));
        vec3.normalize(guidingVector, guidingVector);

        return {
            ...closestPoint,
            guidingVector
        };
    }
}
