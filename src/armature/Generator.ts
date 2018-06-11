import { vec3 } from 'gl-matrix';
import { Node, Point } from './Node';

import { range } from 'lodash';

type Definition = {
    weight: number;
    generator(root: Point);
};

type SpawnPoint = {
    component: string;
    at: Point;
};

/**
 * A way of representing a structure made of connected components, facilitating procedural
 * generation of instances of these structures.
 */
export class Generator {
    private rules: { [name: string]: { totalWeight: number; definitions: Definition[] } } = {};
    private spawnPoints: SpawnPoint[] = [];
    private nextSpawnPoints: SpawnPoint[] = [];

    /**
     * Define a component to procedurally generate a component of a struture.
     *
     * @param {string} name The name of the component being generated.
     * @param {number} weight How much likely it is that this definition of should be used,
     * relative to other definititions of the same component. E.g. if one definition has a weight
     * of 2 and another has a weight of 1, there is a 2:1 chance that the first one will be used.
     * @param {(root: Point) => void} generator A function that takes in a spawn point and generates
     * geometry at that point. Call `addDetail` in the function to spawn more.
     * @returns {Generator} The current generator, so that more methods can be chained.
     */
    public define(name: string, weight: number, generator: (root: Point) => void): Generator {
        // Make a component for the given name if one doesn't already exist
        if (this.rules[name] === undefined) {
            this.rules[name] = { totalWeight: 0, definitions: [] };
        }

        // Keep track of the total weight for all component definitions of this name, so we can later
        // generate a number in the range of the total weight
        this.rules[name].totalWeight += weight;
        this.rules[name].definitions.push({ weight, generator });

        return this;
    }

    /**
     * Tells the generator that more components can be generated somewhere.
     *
     * @param {SpawnPoint} spawnPoint The name of the component to spawn and the point at which to
     * spawn it.
     */
    public addDetail(spawnPoint: SpawnPoint) {
        this.nextSpawnPoints.push(spawnPoint);
    }

    /**
     * Randomly generate an armature from the current component definitions.
     *
     * @param {string} start The name of the component to use as a base.
     * @param {number?} depth How many iterations of generation should be used.
     * @returns {Node} The root node of the generated armature.
     */
    public generate(params: { start: string; depth?: number }): Node {
        const { start, depth = 10 } = params;

        // Clear spawn points
        this.nextSpawnPoints.length = 0;

        // Create root node and initial spawn point
        const root = new Node();
        root.createPoint('spawn', vec3.fromValues(0, 0, 0));
        this.addDetail({ component: start, at: root.point('spawn') });

        // Run `depth` rounds of generation
        range(depth).forEach(() => {
            this.cycleSpawnPoints();
            this.spawnPoints.forEach((spawnPoint: SpawnPoint) => {
                const generator = this.getGenerator(spawnPoint.component);
                generator(spawnPoint.at);
            });
        });

        return root;
    }

    /**
     * Clears spawnPoints, and moves everything from nextSpawnPoints into spawnPoints.
     */
    private cycleSpawnPoints() {
        this.spawnPoints.length = 0;
        this.spawnPoints.push(...this.nextSpawnPoints.splice(0, this.nextSpawnPoints.length));
    }

    /**
     * Picks a weighted random generator function for the given component name. If there are
     * multiple definitions of a component (different ways to spawn that component), this will
     * randomly pick one of those ways, according to the weights assigned to each way.
     *
     * @param {string} component The name of a component that we want to get a generator for.
     * @returns {(root: Point) => void} A function to generate an instance of the component.
     */
    private getGenerator(component: string): (root: Point) => void {
        if (this.rules[component] === undefined) {
            throw new Error(`Cannot find definition for component "${component}"`);
        }

        const value = Math.random() * this.rules[component].totalWeight;
        let weight = 0;
        for (const definition of this.rules[component].definitions) {
            weight += definition.weight;
            if (weight >= value) {
                return definition.generator;
            }
        }

        throw new Error('Error finding a weighted definition. Are all weights positive?');
    }
}
