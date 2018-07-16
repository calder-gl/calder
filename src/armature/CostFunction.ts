import { coord } from '../calder';
import { AABB } from '../geometry/BakedGeometry';
import { vec3From4 } from '../math/utils';
import { worldSpaceAABB } from '../utils/aabb';
import { Mapper } from '../utils/mapper';
import { CostFn, GeneratorInstance, SpawnPoint } from './Generator';
import { Model } from './Model';
import { GeometryNode, Node } from './Node';

import { vec3, vec4 } from 'gl-matrix';
import { range } from 'lodash';

export type ForcePoint = {
    point: coord;
    influence: number;
};

type Grid = { [key: string]: true };

export namespace CostFunction {
    /**
     * Use points with positive and negative influence to control generation.
     *
     * @param {ForcePoint[]} points The points of influence, where negative influence means the
     * point reduces the overall cost when nodes get close.
     * @returns {CostFn} The resulting cost function.
     */
    export function forces(forcePoints: ForcePoint[]): CostFn {
        const vectors = forcePoints.map((forcePoint: ForcePoint) => {
            return {
                vector: Mapper.coordToVector(forcePoint.point),
                influence: forcePoint.influence
            };
        });

        return (instance: GeneratorInstance, added: Node[]) => {
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

                vectors.forEach((point: { vector: vec3; influence: number }) => {
                    // Add cost relative to the point's influence, and inversely proportional
                    // to the distance to the point
                    totalCost +=
                        point.influence /
                        vec3.length(vec3.sub(vec3.create(), point.vector, globalPosition));
                });
            });

            return { realCost: totalCost, heuristicCost: 0 };
        };
    }

    /**
     * Creates a cost function based on how much of a target volume a shape fills.
     *
     * @param {Model} targetModel The model whose shape we try to fill.
     * @param {number} cellSize How big each cell in the volume grid should be.
     * @returns {CostFn} The resulting cost function.
     */
    // tslint:disable-next-line:max-func-body-length
    export function fillVolume(targetModel: Model, cellSize: number): CostFn {
        const gridCache = new Map<Node, Grid>();

        // A grid uses a string as a key because otherwise it would use object equality on points,
        // which we don't want. This function makes a string key from a point.
        const makeKey = (point: vec4) => {
            const keyX = Math.floor(point[0] / cellSize);
            const keyY = Math.floor(point[1] / cellSize);
            const keyZ = Math.floor(point[2] / cellSize);

            return `${keyX},${keyY},${keyZ}`;
        };

        // Returns the points that are in a world-space AABB.
        const pointsInAABB = (aabb: AABB) => {
            const points: string[] = [];
            const point = vec4.fromValues(0, 0, 0, 1);
            if (isNaN(vec4.squaredLength(aabb.min)) || isNaN(vec4.squaredLength(aabb.max))) {
                return [];
            }

            // Step through x, y, and z from min to max, adding each step to the
            // `points` array
            range(Math.floor(aabb.min[0]), Math.ceil(aabb.max[0]), cellSize).forEach(
                (x: number) => {
                    range(Math.floor(aabb.min[1]), Math.ceil(aabb.max[1]), cellSize).forEach(
                        (y: number) => {
                            range(
                                Math.floor(aabb.min[2]),
                                Math.ceil(aabb.max[2]),
                                cellSize
                            ).forEach((z: number) => {
                                point[0] = x;
                                point[1] = y;
                                point[2] = z;
                                points.push(makeKey(point));
                            });
                        }
                    );
                }
            );

            return points;
        };

        const addAABBToGrid = (aabb: AABB, grid: Grid, onAdded: (added: string) => void) => {
            pointsInAABB(aabb).forEach((point: string) => {
                if (!grid[point]) {
                    grid[point] = true;

                    onAdded(point);
                }
            });
        };

        // For each node in the target model, find its bounding box
        const targetCoords: Grid = {};
        targetModel.nodes.forEach((n: Node) =>
            n.geometryCallback((node: GeometryNode) => {
                pointsInAABB(worldSpaceAABB(node, node.geometry.aabb)).forEach(
                    (point: string) => (targetCoords[point] = true)
                );
            })
        );

        return (instance: GeneratorInstance, added: Node[]) => {
            // We will cache grids based on the last node that was added to a model. Since nodes are
            // added to the end of a model's node list, if n nodes are new in the current model
            // compared to its parent, then the parent grid will be indexed by the nth-from-last
            // node in the current model's node list.
            const parentGrid = gridCache.get(
                instance.getModel().nodes[instance.getModel().nodes.length - 1 - added.length]
            );

            // If the parent grid does exist, we want to start from the same grid as the
            // parent, and then add to it
            const grid = parentGrid === undefined ? {} : { ...parentGrid };

            let incrementalCost = 0;
            let heuristicCost = 0;

            // For each point in the new added geometry, see if it fills a point in the target shape
            // that wasn't previously filled, and make the current model cost less accordingly
            added.forEach((n: Node) =>
                n.geometryCallback((node: GeometryNode) =>
                    addAABBToGrid(
                        worldSpaceAABB(node, node.geometry.aabb),
                        grid,
                        (point: string) =>
                            // If this point was in the target region, reduce the cost
                            (incrementalCost +=
                                cellSize * cellSize * cellSize * (targetCoords[point] ? -1 : 1))
                    )
                )
            );

            gridCache.set(instance.getModel().latest(), grid);

            const heuristicGrid = { ...grid };
            instance.getSpawnPoints().forEach((spawnPoint: SpawnPoint) => {
                const aabb = instance.generator.getExpectedRuleVolume(spawnPoint.component);
                addAABBToGrid(
                    worldSpaceAABB(spawnPoint.at.node, aabb),
                    heuristicGrid,
                    (point: string) =>
                        (heuristicCost +=
                            cellSize * cellSize * cellSize * (targetCoords[point] ? -1 : 1))
                );
            });

            return { realCost: instance.getCost().realCost + incrementalCost, heuristicCost };
        };
    }
}
