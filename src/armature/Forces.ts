import { coord } from '../calder';
import { vec3From4 } from '../math/utils';
import { Mapper } from '../utils/mapper';
import { Cost, CostFn, GeneratorInstance } from './Generator';
import { GeometryNode, Node } from './Node';

import { vec3, vec4 } from 'gl-matrix';

export type ForcePoint = {
    point: coord;
    influence: number;
};

/**
 * Use points with positive and negative influence to control generation.
 */
export class Forces implements CostFn {
    private vectors: { vector: vec3; influence: number }[];

    /**
     * @param {ForcePoint[]} points The points of influence, where negative influence means the
     * point reduces the overall cost when nodes get close.
     */
    constructor(forcePoints: ForcePoint[]) {
        this.vectors = forcePoints.map((forcePoint: ForcePoint) => {
            return {
                vector: Mapper.coordToVector(forcePoint.point),
                influence: forcePoint.influence
            };
        });
    }

    public getCost(instance: GeneratorInstance, added: Node[]): Cost {
        // Out of the added nodes, just get the geometry nodes
        const addedGeometry: GeometryNode[] = [];
        added.forEach((n: Node) =>
            n.geometryCallback((node: GeometryNode) => {
                addedGeometry.push(node);
            })
        );

        let totalCost = instance.getCost().realCost;

        // For each added shape and each influence point, add the resulting cost to the
        // instance's existing cost.
        addedGeometry.forEach((node: GeometryNode) => {
            const localToGlobalTransform = node.localToGlobalTransform();
            const globalPosition = vec3From4(
                vec4.transformMat4(
                    vec4.create(),
                    vec4.fromValues(0, 0, 0, 1),
                    localToGlobalTransform
                )
            );

            this.vectors.forEach((point: { vector: vec3; influence: number }) => {
                // Add cost relative to the point's influence, and inversely proportional
                // to the distance to the point
                totalCost +=
                    point.influence /
                    vec3.squaredLength(vec3.sub(vec3.create(), point.vector, globalPosition));
            });
        });

        return { realCost: totalCost, heuristicCost: 0 };
    }
}
