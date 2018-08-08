import { coord } from '../calder';
import { vec3From4, vec3ToPoint } from '../math/utils';
import { Mapper } from '../utils/mapper';
import { ForcePoint } from './Forces';
import { Cost, GeneratorInstance } from './Generator';
import { Node } from './Node';

import 'bezier-js';
import { vec3, vec4 } from 'gl-matrix';
import { minBy, range } from 'lodash';

type Closest = {
    curve: BezierJs.Bezier;
    point: BezierJs.Projection;
};

export class GuidingVectors {
    private vectors: BezierJs.Bezier[];
    private forces: { vector: vec4; influence: number }[];
    private nodeLocations: Map<Node, vec4> = new Map<Node, vec4>();

    /**
     * @param {ForcePoint[]} points The points of influence, where negative influence means the
     * point reduces the overall cost when nodes get close.
     */
    constructor(guidingVectors: BezierJs.Bezier[], forcePoints: ForcePoint[]) {
        this.vectors = guidingVectors;

        this.forces = forcePoints.map((forcePoint: ForcePoint) => {
            return {
                vector: vec3ToPoint(Mapper.coordToVector(forcePoint.point)),
                influence: forcePoint.influence
            };
        });
    }

    public generateVectorField(radius: number = 3, step: number = 0.5): Float32Array {
        const field: number[] = [];

        range(-radius, radius, step).forEach((x: number) => {
            range(-radius, radius, step).forEach((y: number) => {
                range(-radius, radius, step).forEach((z: number) => {
                    field.push(x, y, z);
                    const closest = this.closest(vec4.fromValues(x, y, z, 1));
                    const vector = <coord>closest.curve.derivative(<number>closest.point.t);
                    //console.log(vector);
                    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
                    vector.x /= length;
                    vector.y /= length;
                    vector.z /= length;
                    field.push(x + vector.x / 4, y + vector.y / 4, z + vector.z / 4);
                });
            });
        });

        return Float32Array.from(field);
    }

    public closest(point: vec4): Closest {
        return <Closest>minBy(
            this.vectors.map((b: BezierJs.Bezier) => {
                return {
                    curve: b,
                    point: b.project(Mapper.vectorToCoord(vec3From4(point)))
                };
            }),
            (c: Closest) => c.point.d);
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
            const globalPosition = vec4.transformMat4(
                vec4.create(),
                vec4.fromValues(0, 0, 0, 1),
                localToGlobalTransform
            );
            this.nodeLocations.set(node, globalPosition);

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
            const vector = vec4.sub(vec4.create(), globalPosition, parentPosition);
            vec4.normalize(vector, vector);

            // Add force point influence
            this.forces.forEach((point: { vector: vec4; influence: number }) => {
                // Add cost relative to the point's influence, and inversely proportional
                // to the distance to the point
                totalCost += 0 *
                    point.influence /
                    Math.min(10000, vec4.squaredDistance(point.vector, globalPosition));
            });

            // Add guiding vector influence
            const closest = this.closest(parentPosition);
            const guidingVector = Mapper.coordToVector(<coord>closest.curve.derivative(<number>closest.point.t));

            totalCost +=
                100 * (-vec3.dot(guidingVector, vec3From4(vector)) + 1);
        });

        return { realCost: totalCost, heuristicCost: 0 };
    }
}
