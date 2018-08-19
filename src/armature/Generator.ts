import { AABB } from '../geometry/BakedGeometry';
import { RandomGenerator } from '../utils/random';
import { Model } from './Model';
import { Node, Point } from './Node';

import { minBy, range } from 'lodash';

/**
 * A function to generate a component from a spawn point. These are the body of rule definitions.
 */
type GeneratorFn = (root: Point, instance: GeneratorInstance) => void;

type Definition = {
    weight: number;
    generator: GeneratorFn;
};

export type SpawnPoint = {
    component: string;
    at: Point;
};

type RuleInfo = {
    totalWeight: number;
    definitions: Definition[];
    expectedVolumes: AABB[];
};

/**
 * A cost is split up into two components: the real part, known for sure based on existing data,
 * and the heuristic, which is a guess of the remaining cost for the rest of the fully generated
 * model.
 */
export type Cost = {
    realCost: number;
    heuristicCost: number;
};

export const emptyCost: Cost = { realCost: 0, heuristicCost: 0 };

/**
 * A cost function returns the cost of an entire model. The new nodes that were added
 * since the last iteration of generation are passed to the cost function so that, if you can,
 * you can just compute the incremental cost and add it to the previous cost, `instance.getCost()`.
 */
export interface CostFn {
    getCost(instance: GeneratorInstance, nodes: Node[]): Cost;
}

/**
 * An instance of a generated model, possibly in the middle of generation.
 */
export class GeneratorInstance {
    public readonly generator: Generator;
    private model: Model = new Model();
    private costFn: CostFn;
    private cost: Cost = emptyCost;
    private spawnPoints: SpawnPoint[] = [];
    private random: RandomGenerator = Math.random;

    /**
     * Creates an instance of a generator, with a function specifying how to evaluate how "good"
     * it is.
     *
     * @param {Generator} generator The generator this is an instance of.
     * @param {CostFn} costFn A function to evaluate this instance.
     */
    constructor(generator: Generator, costFn: CostFn) {
        this.generator = generator;
        this.costFn = costFn;
    }

    /**
     * A wrapper for `mode.add`, for convenience when defining rules.
     *
     * @param {Node} node The node to add to the model.
     * @returns {Node} The node that was added.
     */
    public add(node: Node): Node {
        return this.model.add(node);
    }

    /**
     * @returns {GeneratorInstance} A flat copy of this generator instance.
     */
    public clone(): GeneratorInstance {
        const cloned = new GeneratorInstance(this.generator, this.costFn);
        cloned.model = this.model.clone();
        cloned.cost = this.cost;
        cloned.spawnPoints = [...this.spawnPoints];

        return cloned;
    }

    /**
     * @returns {Model} The model this instance has generated so far.
     */
    public getModel(): Model {
        return this.model;
    }

    /**
     * @returns {SpawnPoint[]} The currently open spawn points that have yet to be generated from.
     */
    public getSpawnPoints(): SpawnPoint[] {
        return this.spawnPoints;
    }

    /**
     * @returns {Cost} The current cost of the model the instance has generated so far.
     */
    public getCost(): Cost {
        return this.cost;
    }

    /**
     * @returns {number} The weight for this instance based on its cost, so that more weight is
     * given to instances with lower cost.
     */
    public getCostWeight(): number {
        // 1 / e^x means that lower (even negative) costs get a higher weight.
        // Using 1/ e^x instead of e^(-x) for numerical stability.
        return 1 / Math.exp(this.cost.realCost + this.cost.heuristicCost * 50);
    }

    /**
     * Tells the generator that more components can be generated somewhere.
     *
     * @param {SpawnPoint} spawnPoint The name of the component to spawn and the point at which to
     * spawn it.
     */
    public addDetail(spawnPoint: SpawnPoint) {
        this.spawnPoints.push(spawnPoint);
    }

    /**
     * Grows this instance, if possible, until a new shape is added.
     */
    public growIfPossible() {
        const originalLength = this.model.nodes.length;

        while (this.model.nodes.length === originalLength && this.spawnPoints.length > 0) {
            // Remove a random spawn point from the list of active points
            const spawnPoint = this.spawnPoints.splice(
                Math.floor(this.random() * this.spawnPoints.length),
                1
            )[0];

            // Get a definition for the rule at the picked spawn point
            const generator = this.generator.getGenerator(spawnPoint.component);

            // Add things to the model using the rule definition
            generator(spawnPoint.at, this);
        }

        // Get the new nodes that were added
        const added = this.model.nodes.slice(originalLength);

        // Recompute the cost
        this.cost = this.costFn.getCost(this, added);
    }

    /**
     * Randomly generate an armature from the current component definitions.
     *
     * @param {string} start The name of the component to use as a base.
     * @param {number?} depth How many iterations of generation should be used.
     * @returns {Node} The root node of the generated armature.
     */
    public generate(params: { start: string; depth?: number }) {
        const { start, depth = 10 } = params;

        this.initialize(start);

        // Run `depth` rounds of generation
        range(depth).forEach(() => {
            this.growIfPossible();
        });
    }

    /**
     * Prepares this instance for generation.
     *
     * @param {string} start The name of the rule to start generating from.
     */
    public initialize(start: string) {
        this.cost = emptyCost;

        // Clear spawn points
        this.spawnPoints.length = 0;

        // Create initial spawn point
        this.model = new Model([new Node()]);
        this.model.root().createPoint('spawn', { x: 0, y: 0, z: 0 });
        this.addDetail({ component: start, at: this.model.root().point('spawn') });
    }
}

/**
 * A way of representing a structure made of connected components, facilitating procedural
 * generation of instances of these structures.
 *
 * Expected usage: A Generator is created, and then the user defines multiple rules on it. If
 * you want to define your own multiple rule definitions, you should use `defineWeighted`. You
 * should not be creating a `maybe` or a `choice` for one rule and then adding another
 * definition for the same rule.
 */
export class Generator {
    private rules: { [name: string]: RuleInfo } = {};
    private random: RandomGenerator = Math.random;

    /**
     * Define a component to procedurally generate a component of a struture. All components defined
     * in this way have equal weight.
     *
     * @param {string} name The name of the component being generated.
     * @param {GeneratorFn} generator A function that takes in a spawn point and generates geometry
     * at that point. Call `addDetail` in the function to spawn more.
     * @returns {Generator} The current generator, so that more methods can be chained.
     */
    public define(name: string, generator: GeneratorFn): Generator {
        return this.defineWeighted(name, 1, generator);
    }

    /**
     * Define a component to procedurally generate a component of a struture, with a 50% chance
     * that is gets created, and a 50% chance that it does not.
     *
     * @param {string} name The name of the component being generated.
     * @param {GeneratorFn} generator A function that takes in a spawn point and generates
     * geometry at that point. Call `addDetail` in the function to spawn more.
     * @returns {Generator} The current generator, so that more methods can be chained.
     */
    public maybe(name: string, generator: GeneratorFn): Generator {
        return this.define(name, generator).define(name, () => {});
    }

    /**
     * Define a component as one of a set of possible choices, all with an equal likelihood
     * of being selected.
     *
     * @param {string} name The name of the component being generated.
     * @param {GeneratorFn[]} generators Functions that takes in a spawn point and
     * generates geometry at that point. Call `addDetail` in functions to spawn more.
     * @returns {Generator} The current generator, so that more methods can be chained.
     */
    public choice(name: string, generators: GeneratorFn[]): Generator {
        generators.forEach((generator: GeneratorFn) => this.define(name, generator));

        return this;
    }

    /**
     * Define a component to procedurally generate a component of a struture, with a given weight.
     *
     * @param {string} name The name of the component being generated.
     * @param {number} weight How much likely it is that this definition of should be used,
     * relative to other definititions of the same component. E.g. if one definition has a weight
     * of 2 and another has a weight of 1, there is a 2:1 chance that the first one will be used.
     * @param {GeneratorFn} generator A function that takes in a spawn point and generates
     * geometry at that point. Call `addDetail` in the function to spawn more.
     * @returns {Generator} The current generator, so that more methods can be chained.
     */
    public defineWeighted(name: string, weight: number, generator: GeneratorFn): Generator {
        // Make a component for the given name if one doesn't already exist
        if (this.rules[name] === undefined) {
            this.rules[name] = { totalWeight: 0, definitions: [], expectedVolumes: [] };
        }

        // Keep track of the total weight for all component definitions of this name, so we can later
        // generate a number in the range of the total weight
        this.rules[name].totalWeight += weight;
        this.rules[name].definitions.push({ weight, generator });

        return this;
    }

    /**
     * Generates a single model.
     *
     * @param {string} start The name of the rule to start generating from.
     * @param {number} depth How many iterations to run before stopping.
     * @returns {Model} The model that was generated.
     */
    public generate(params: { start: string; depth?: number }): Model {
        const instance = new GeneratorInstance(this, { getCost: () => emptyCost });
        instance.generate(params);

        return instance.getModel();
    }

    /**
     * Generates a model using the SOSMC algorithm, which samples multiple instances of this
     * generator, favoring ones with a lower cost.
     *
     * @param {string} start The name of the rule to start generating from.
     * @param {number} sosmcDepth How many iterations to run before stopping SOSMC.
     * @param {number} finalDepth How many iterations to run the final sample to afterward.
     * @param {number} samples How many samples to look at in parallel.
     * @param {CostFn} costFn A function used to measure the cost of each sample.
     * @returns {Model} The model that was generated.
     */
    public generateSOSMC(params: {
        start: string;
        sosmcDepth?: number;
        finalDepth?: number;
        samples?: number;
        costFn: CostFn;
        /**
         * For debugging, a callback can be passed in so that every sample in the final
         * generation can be examined.
         */
        onLastGeneration?: (instances: GeneratorInstance[]) => void;
    }): Model {
        const {
            start,
            sosmcDepth = 10,
            finalDepth = 100,
            samples = 50,
            costFn,
            onLastGeneration
        } = params;
        let instances = range(samples).map(() => new GeneratorInstance(this, costFn));

        this.computeExpectedVolumes(10, 40);

        // Seed instances with starting state
        instances.forEach((instance: GeneratorInstance) => instance.initialize(start));

        range(sosmcDepth).forEach((iteration: number) => {
            // Step 1: grow samples
            instances.forEach((instance: GeneratorInstance) => instance.growIfPossible());

            // Step 2: if there will be more iterations, do a weighted resample
            if (iteration + 1 !== sosmcDepth) {
                // We use "weight" here instead of cost to define how likely an instance is to be
                // picked for the next generation. A low cost should give a high weight, and a high
                // cost should give a low weight.

                const totalWeight = instances.reduce(
                    (accum: number, instance: GeneratorInstance) => {
                        return accum + instance.getCostWeight();
                    },
                    0
                );

                // Re-pick instances from the previous set, according to their weights
                instances = instances.map(() => {
                    // Generate a random number in [0, totalWeight)
                    let sample = this.random() * totalWeight;

                    // Subtract each instance's weight from the generated number until it reaches
                    // zero. The instance to make it reach zero is the instance corresponding to
                    // the random number we generated.
                    let picked: GeneratorInstance = instances[0];
                    let i = 0;
                    while (sample > 0 && i < instances.length - 1) {
                        picked = instances[i];
                        sample -= instances[i].getCostWeight();
                        i += 1;
                    }

                    // Make a new copy of the picked instance that can be grown independently from
                    // the original version.
                    return picked.clone();
                });
            }
        });

        if (onLastGeneration !== undefined) {
            onLastGeneration(instances);
        }

        // From the last generation, pick the one with the lowest cost.
        const finalInstance = <GeneratorInstance>minBy(instances, (instance: GeneratorInstance) =>
            instance.getCost()
        );
        range(0, Math.max(0, finalDepth - sosmcDepth)).forEach(() =>
            finalInstance.growIfPossible()
        );

        return finalInstance.getModel();
    }

    /**
     * Picks a weighted random generator function for the given component name. If there are
     * multiple definitions of a component (different ways to spawn that component), this will
     * randomly pick one of those ways, according to the weights assigned to each way.
     *
     * @param {string} component The name of a component that we want to get a generator for.
     * @returns {GeneratorFn} A function to generate an instance of the component.
     */
    public getGenerator(component: string): GeneratorFn {
        if (this.rules[component] === undefined) {
            throw new Error(`Cannot find definition for component "${component}"`);
        }

        const value = this.random() * this.rules[component].totalWeight;
        let weight = 0;
        for (const definition of this.rules[component].definitions) {
            weight += definition.weight;
            if (weight >= value) {
                return definition.generator;
            }
        }

        throw new Error('Error finding a weighted definition. Are all weights positive?');
    }

    /**
     * Picks a plausible bounding volume that a component, when generated, could occupy.
     *
     * @param {string} component The component being spawned.
     * @returns {AABB} An axis-aligned bounding box that the component could occupy.
     */
    public getExpectedRuleVolume(component: string): AABB {
        const volumes = this.rules[component].expectedVolumes;

        return volumes[Math.floor(Math.random() * volumes.length)];
    }

    /**
     * Generates each component multiple times to compute expected bounding volumes.
     *
     * @param {number} numVolumes The number of bounding volumes to generate per component.
     * @param {number} depth How many rounds of generation should be used per generated instance
     * of a component.
     */
    private computeExpectedVolumes(numVolumes: number, depth: number) {
        Object.keys(this.rules).forEach((name: string) => {
            const rule = this.rules[name];

            rule.expectedVolumes = range(numVolumes).map(() =>
                this.generate({ start: name, depth }).computeAABB()
            );
        });
    }
}
