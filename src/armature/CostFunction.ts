import { coord } from '../calder';
import { vec3From4 } from '../math/utils';
import { Mapper } from '../utils/mapper';
import { GeneratorInstance } from './Generator';
import { Model } from './Model';
import { GeometryNode, Node } from './Node';

import {vec3, vec4} from 'gl-matrix';
import {range} from 'lodash';

export type ForcePoint = {
    point: coord;
    influence: number;
};

type Grid = {[key: string]: true};
type AABB = {min: coord; max: coord};

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

    export function fillVolume(model: Model, cellSize: number) {
        const instanceGrids = new Map<GeneratorInstance, Grid>();
        const makeKey = (point: coord) => {
            const keyX = Math.round(point.x / cellSize);
            const keyY = Math.round(point.y / cellSize);
            const keyZ = Math.round(point.z / cellSize);

            return `${keyX},${keyY},${keyZ}`;
        }

        const makeAABB = (node: GeometryNode) => {
            const localToGlobalTransform = node.localToGlobalTransform();
            const min = {x: Infinity, y: Infinity, z: Infinity};
            const max = {x: -Infinity, y: -Infinity, z: -Infinity};
            range(0, node.geometry.vertices.length, 3).forEach((i: number) => {
                const globalPosition = vec3From4(vec4.transformMat4(vec4.create(), vec4.fromValues(
                    node.geometry.vertices[i],
                    node.geometry.vertices[i+1],
                    node.geometry.vertices[i+2],
                    1
                ), localToGlobalTransform));

                min.x = Math.min(min.x, globalPosition[0]);
                min.y = Math.min(min.x, globalPosition[1]);
                min.z = Math.min(min.x, globalPosition[2]);

                max.x = Math.max(max.x, globalPosition[0]);
                max.y = Math.max(max.x, globalPosition[1]);
                max.z = Math.max(max.x, globalPosition[2]);
            });

            return {min, max};
        };

        const pointInAABB = (point: coord, aabb: AABB) => {
            return (
                point.x >= aabb.min.x && point.x <= aabb.max.x &&
                point.y >= aabb.min.y && point.y <= aabb.max.y &&
                point.z >= aabb.min.z && point.z <= aabb.max.z
            );
        };

        const targetAABBs: AABB[] = [];
        model.nodes.forEach((n: Node) => n.geometryCallback((node: GeometryNode) => {
            targetAABBs.push(makeAABB(node));
        }));

        return (instance: GeneratorInstance, added: GeometryNode[]) => {
            if (!instanceGrids.has(instance)) {
                instanceGrids.set(instance, {});
            }
            const grid = <Grid>instanceGrids.get(instance);
            let incrementalCost = 0;

            added.forEach((node: GeometryNode) => {
                // 1. Find axis-aligned bounding box in world coordinate
                const addedAABB = makeAABB(node);

                // 2. Fill bounding box cells in grid
                targetAABBs.forEach((target: AABB) => {
                    range(target.min.x, target.max.x, cellSize).forEach((x: number) => {
                        range(target.min.y, target.max.y, cellSize).forEach((y: number) => {
                            range(target.min.z, target.max.z, cellSize).forEach((z: number) => {
                                const key = makeKey({x, y, z});
                                if (!grid[key] && pointInAABB({x, y, z}, addedAABB)) {
                                    grid[key] = true;
                                    incrementalCost -= 1;
                                }
                            });
                        });
                    });
                });
            });

            return instance.getCost() + incrementalCost;
        }
    }
}
