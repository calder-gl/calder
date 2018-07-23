import { coord } from '../calder';
import { vec3ToPoint, vec3ToVector } from '../math/utils';
import { Mapper } from '../utils/mapper';
import { ForcePoint } from './Forces';
import { Cost, GeneratorInstance } from './Generator';
import { Node } from './Node';

import { vec4 } from 'gl-matrix';
import { minBy } from 'lodash';

export type GuidingVector = {
    point: coord;
    vector: coord;
    influence: number;
};

type InternalGuidingVector = {
    point: vec4;
    vector: vec4;
    lengthSquared: number;
    influence: number;
};

export class GuidingVectors {
    private vectors: InternalGuidingVector[];
    private forces: { vector: vec4; influence: number }[];
    private nodeLocations: Map<Node, vec4> = new Map<Node, vec4>();

    /**
     * @param {ForcePoint[]} points The points of influence, where negative influence means the
     * point reduces the overall cost when nodes get close.
     */
    constructor(guidingVectors: GuidingVector[], forcePoints: ForcePoint[]) {
        this.vectors = guidingVectors.map((guide: GuidingVector) => {
            const direction = vec3ToVector(Mapper.coordToVector(guide.vector));
            const lengthSquared = vec4.squaredLength(direction);
            vec4.normalize(direction, direction);
            return {
                point: vec3ToPoint(Mapper.coordToVector(guide.point)),
                vector: direction,
                lengthSquared,
                influence: guide.influence
            };
        });

        this.forces = forcePoints.map((forcePoint: ForcePoint) => {
            return {
                vector: vec3ToPoint(Mapper.coordToVector(forcePoint.point)),
                influence: forcePoint.influence
            };
        });
    }

    public closestVector(point: vec4): InternalGuidingVector {
        return <InternalGuidingVector>minBy(this.vectors, (v: InternalGuidingVector) => {
            return vec4.squaredDistance(point, v.point);
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
            const vectorLengthSquared = vec4.squaredLength(vector);
            vec4.normalize(vector, vector);

            // Add force point influence
            this.forces.forEach((point: { vector: vec4; influence: number }) => {
                // Add cost relative to the point's influence, and inversely proportional
                // to the distance to the point
                totalCost +=
                    point.influence /
                    Math.min(10000, vec4.squaredDistance(point.vector, globalPosition));
            });

            // Add guiding vector influence
            const guidingVector = this.closestVector(parentPosition);
            totalCost +=
                guidingVector.influence *
                (1 - vec4.dot(guidingVector.vector, vector)) *
                (1 + Math.abs(vectorLengthSquared - guidingVector.lengthSquared));
        });

        totalCost /= 10;

        return { realCost: totalCost, heuristicCost: 0 };
    }
}
