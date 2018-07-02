import { coord } from '../calder';
import { vec3From4 } from '../math/utils';
import { Mapper } from '../utils/mapper';
import { CostFn, GeneratorInstance } from './Generator';
import { Model } from './Model';
import { GeometryNode, Node } from './Node';

import { vec3, vec4 } from 'gl-matrix';
import { range } from 'lodash';

export type ForcePoint = {
    point: coord;
    influence: number;
};

type Grid = { [key: string]: true };
type AABB = { min: coord; max: coord };

export namespace CostFunction {
    /**
     * Use points with positive and negative influence to control generation.
     *
     * @param {ForcePoint[]} points The points of influence, where negative influence means the
     * point reduces the overall cost when nodes get close.
     * @returns {CostFn} The resulting cost function.
     */
    export function forces(points: ForcePoint[]): CostFn {
        const vectors = points.map((forcePoint: ForcePoint) => {
            return {
                vector: Mapper.coordToVector(forcePoint.point),
                influence: forcePoint.influence
            };
        });

        return (instance: GeneratorInstance, added: GeometryNode[]) => {
            // For each added shape and each influence point, add the resulting cost to the
            // instance's existing cost.
            return added.reduce((sum: number, node: GeometryNode) => {
                const localToGlobalTransform = node.localToGlobalTransform();
                const globalPosition = vec3From4(
                    vec4.transformMat4(
                        vec4.create(),
                        vec4.fromValues(0, 0, 0, 1),
                        localToGlobalTransform
                    )
                );

                return vectors.reduce(
                    (total: number, point: { vector: vec3; influence: number }) => {
                        // Add cost relative to the point's influence, and inversely proportional
                        // to the distance to the point
                        return (
                            total +
                            point.influence /
                                vec3.length(vec3.sub(vec3.create(), point.vector, globalPosition))
                        );
                    },
                    sum
                );
            }, instance.getCost());
        };
    }

    /**
     * Creates a cost function based on how much of a target volume a shape fills.
     *
     * @param {Model} targetModel The model whose shape we try to fill.
     * @param {number} cellSize How big each cell in the volume grid should be.
     * @returns {CostFn} The resulting cost function.
     */
    export function fillVolume(targetModel: Model, cellSize: number): CostFn {
        // A grid uses a string as a key because otherwise it would use object equality on points,
        // which we don't want. This function makes a string key from a point.
        const makeKey = (point: coord) => {
            const keyX = Math.round(point.x / cellSize);
            const keyY = Math.round(point.y / cellSize);
            const keyZ = Math.round(point.z / cellSize);

            return `${keyX},${keyY},${keyZ}`;
        };

        // Given a GeometryNode, make an axis-aligned bounding box, which consists of a min corner
        // and a max corner.
        const makeAABB = (node: GeometryNode) => {
            const localToGlobalTransform = node.localToGlobalTransform();
            const min = { x: Infinity, y: Infinity, z: Infinity };
            const max = { x: -Infinity, y: -Infinity, z: -Infinity };
            range(0, node.geometry.vertices.length, 3).forEach((i: number) => {
                const globalPosition = vec3From4(
                    vec4.transformMat4(
                        vec4.create(),
                        vec4.fromValues(
                            node.geometry.vertices[i],
                            node.geometry.vertices[i + 1],
                            node.geometry.vertices[i + 2],
                            1
                        ),
                        localToGlobalTransform
                    )
                );

                min.x = Math.min(min.x, globalPosition[0]);
                min.y = Math.min(min.x, globalPosition[1]);
                min.z = Math.min(min.x, globalPosition[2]);

                max.x = Math.max(max.x, globalPosition[0]);
                max.y = Math.max(max.x, globalPosition[1]);
                max.z = Math.max(max.x, globalPosition[2]);
            });

            return { min, max };
        };

        // Check whether a point is inside an axis-aligned bounding box
        const pointInAABB = (point: coord, aabb: AABB) => {
            return (
                point.x >= aabb.min.x &&
                point.x <= aabb.max.x &&
                point.y >= aabb.min.y &&
                point.y <= aabb.max.y &&
                point.z >= aabb.min.z &&
                point.z <= aabb.max.z
            );
        };

        // For each node in the target model, find its bounding box
        const targetAABBs: AABB[] = [];
        targetModel.nodes.forEach((n: Node) =>
            n.geometryCallback((node: GeometryNode) => {
                targetAABBs.push(makeAABB(node));
            })
        );

        return (instance: GeneratorInstance, _: GeometryNode[]) => {
            // TODO: Cache the grid for each instance so that we don't need to recompute the
            // whole thing each time. This is difficult in the same way that having a model
            // supporting efficient copy-and-add is difficult.
            const grid: Grid = {};

            let incrementalCost = 0;

            instance.getModel().nodes.forEach((n: Node) =>
                n.geometryCallback((node: GeometryNode) => {
                    // 1. Find axis-aligned bounding box in world coordinate
                    const addedAABB = makeAABB(node);

                    // 2. Fill bounding box cells in grid
                    targetAABBs.forEach((target: AABB) => {
                        range(target.min.x, target.max.x, cellSize).forEach((x: number) => {
                            range(target.min.y, target.max.y, cellSize).forEach((y: number) => {
                                range(target.min.z, target.max.z, cellSize).forEach((z: number) => {
                                    const key = makeKey({ x, y, z });

                                    // Update grid and incremental cost
                                    if (!grid[key] && pointInAABB({ x, y, z }, addedAABB)) {
                                        grid[key] = true;
                                        incrementalCost -= 1;
                                    }
                                });
                            });
                        });
                    });
                })
            );

            return instance.getCost() + incrementalCost;
        };
    }
}
