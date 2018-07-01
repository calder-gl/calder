import { coord } from '../calder';
import { vec3From4 } from '../math/utils';
import { Mapper } from '../utils/mapper';
import { GeneratorInstance } from './Generator';
import { GeometryNode } from './Node';

import {vec3, vec4} from 'gl-matrix';

export type ForcePoint = {
    point: coord;
    influence: number;
};

export namespace CostFunction {
    export function forces(points: ForcePoint[]) {
        const vectors = points.map((forcePoint: ForcePoint) => {
            return {
                vector: Mapper.coordToVector(forcePoint.point),
                influence: forcePoint.influence
            };
        });

        return (instance: GeneratorInstance, added: GeometryNode[]) => {
            return added.reduce((sum: number, node: GeometryNode) => {
                const localToGlobalTransform = node.localToGlobalTransform();
                const globalPosition = vec3From4(vec4.transformMat4(vec4.create(), vec4.fromValues(0, 0, 0, 1), localToGlobalTransform));

                return vectors.reduce((total: number, point: {vector: vec3; influence: number}) => {
                    return total + point.influence / vec3.length(vec3.sub(vec3.create(), point.vector, globalPosition));
                }, sum);
            }, instance.getCost());
        }
    }
}
