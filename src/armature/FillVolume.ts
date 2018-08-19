import { AABB } from '../geometry/BakedGeometry';
import { worldSpaceAABB } from '../utils/aabb';
import { Cost, CostFn, GeneratorInstance, SpawnPoint } from './Generator';
import { Model } from './Model';
import { GeometryNode, Node } from './Node';

import { vec4 } from 'gl-matrix';
import { range } from 'lodash';

type Grid = { [key: string]: true };

/**
 * Creates a cost function based on how much of a target volume a shape fills.
 */
export class FillVolume implements CostFn {
    private gridCache: Map<Node, Grid> = new Map<Node, Grid>();
    private cellSize: number;
    private targetCoords: Grid = {};

    /**
     * @param {Model} targetModel The model whose shape we try to fill.
     * @param {number} cellSize How big each cell in the volume grid should be.
     * @returns {CostFn} The resulting cost function.
     */
    constructor(targetModel: Model, cellSize: number) {
        this.cellSize = cellSize;

        // For each node in the target model, find its bounding box
        targetModel.nodes.forEach((n: Node) =>
            n.geometryCallback((node: GeometryNode) => {
                this.pointsInAABB(worldSpaceAABB(node, node.geometry.aabb)).forEach(
                    (point: string) => (this.targetCoords[point] = true)
                );
            })
        );
    }

    public getCost(instance: GeneratorInstance, added: Node[]): Cost {
        // We will cache grids based on the last node that was added to a model. Since nodes are
        // added to the end of a model's node list, if n nodes are new in the current model
        // compared to its parent, then the parent grid will be indexed by the nth-from-last
        // node in the current model's node list.
        const parentGrid = this.gridCache.get(
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
                this.addAABBToGrid(
                    worldSpaceAABB(node, node.geometry.aabb),
                    grid,
                    (point: string) =>
                        // If this point was in the target region, reduce the cost
                        (incrementalCost +=
                            this.cellSize *
                            this.cellSize *
                            this.cellSize *
                            (this.targetCoords[point] ? -1 : 1))
                )
            )
        );

        this.gridCache.set(instance.getModel().latest(), grid);

        const heuristicGrid = { ...grid };
        instance.getSpawnPoints().forEach((spawnPoint: SpawnPoint) => {
            const aabb = instance.generator.getExpectedRuleVolume(spawnPoint.component);
            this.addAABBToGrid(
                worldSpaceAABB(spawnPoint.at.node, aabb),
                heuristicGrid,
                (point: string) =>
                    (heuristicCost +=
                        this.cellSize *
                        this.cellSize *
                        this.cellSize *
                        (this.targetCoords[point] ? -1 : 1))
            );
        });

        return { realCost: instance.getCost().realCost + incrementalCost, heuristicCost };
    }

    // Returns the points that are in a world-space AABB.
    private pointsInAABB(aabb: AABB): string[] {
        const points: string[] = [];
        const point = vec4.fromValues(0, 0, 0, 1);
        if (isNaN(vec4.squaredLength(aabb.min)) || isNaN(vec4.squaredLength(aabb.max))) {
            return [];
        }

        // Step through x, y, and z from min to max, adding each step to the
        // `points` array
        range(Math.floor(aabb.min[0]), Math.ceil(aabb.max[0]), this.cellSize).forEach(
            (x: number) => {
                range(Math.floor(aabb.min[1]), Math.ceil(aabb.max[1]), this.cellSize).forEach(
                    (y: number) => {
                        range(
                            Math.floor(aabb.min[2]),
                            Math.ceil(aabb.max[2]),
                            this.cellSize
                        ).forEach((z: number) => {
                            point[0] = x;
                            point[1] = y;
                            point[2] = z;
                            points.push(this.makeKey(point));
                        });
                    }
                );
            }
        );

        return points;
    }

    private addAABBToGrid(aabb: AABB, grid: Grid, onAdded: (added: string) => void) {
        this.pointsInAABB(aabb).forEach((point: string) => {
            if (!grid[point]) {
                grid[point] = true;

                onAdded(point);
            }
        });
    }

    // A grid uses a string as a key because otherwise it would use object equality on points,
    // which we don't want. This function makes a string key from a point.
    private makeKey(point: vec4): string {
        const keyX = Math.floor(point[0] / this.cellSize);
        const keyY = Math.floor(point[1] / this.cellSize);
        const keyZ = Math.floor(point[2] / this.cellSize);

        return `${keyX},${keyY},${keyZ}`;
    }
}
