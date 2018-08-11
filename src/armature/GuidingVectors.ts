import { coord } from '../calder';
import { vec3From4 } from '../math/utils';
import { Mapper } from '../utils/mapper';
import { Cost, GeneratorInstance } from './Generator';
import { Node } from './Node';

import 'bezier-js';
import { vec3, vec4 } from 'gl-matrix';
import { minBy, range } from 'lodash';

type Closest = {
    curve: BezierJs.Bezier;
    point: BezierJs.Projection;
};

/**
 * A cost function that doesn't look at the geometry of a model, only the shape, by comparing
 * the angles in the skeleton to guiding vectors.
 */
export class GuidingVectors {
    private vectors: BezierJs.Bezier[];
    private nodeLocations: Map<Node, vec4> = new Map<Node, vec4>();

    /**
     * @param {BezierJs.Bezier[]} guidingVectors The Bezier paths that will be used to guide the
     * growth of the procedural shape.
     */
    constructor(guidingVectors: BezierJs.Bezier[]) {
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
                    const vector = <coord>closest.curve.derivative(<number>closest.point.t);

                    // Make the vector as long as step/2
                    const length = Math.sqrt(
                        vector.x * vector.x + vector.y * vector.y + vector.z * vector.z
                    );
                    vector.x *= step / 2 / length;
                    vector.y *= step / 2 / length;
                    vector.z *= step / 2 / length;

                    // Add second point: original point plus vector
                    field.push(x + vector.x, y + vector.y, z + vector.z);
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
        return this.vectors.map((b: BezierJs.Bezier) => {
            const curve: number[] = [];

            b.getLUT().forEach((c: BezierJs.Point) => {
                curve.push(c.x, c.y, (<coord>c).z);
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

            // Compare the new structure's vector with the direction vector for the curve point
            const guidingVector = Mapper.coordToVector(<coord>closest.curve.derivative(
                <number>closest.point.t
            ));
            totalCost += (-vec3.dot(guidingVector, vec3From4(vector)) + 1) * 100;
        });

        return { realCost: totalCost, heuristicCost: 0 };
    }

    /**
     * Returns the closest point on any of the target curves to an input point.
     */
    private closest(point: vec4): Closest {
        return <Closest>minBy(
            this.vectors.map((b: BezierJs.Bezier) => {
                return {
                    curve: b,
                    point: b.project(Mapper.vectorToCoord(vec3From4(point)))
                };
            }),
            (c: Closest) => c.point.d
        );
    }
}
