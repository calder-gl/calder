import { RandomGenerator } from '../utils/random';
import { Model } from './Model';
import { GeometryNode, Node, Point } from './Node';

import { minBy, range } from 'lodash';

/**
 * A function to generate a component from a spawn point. These are the body of rule definitions.
 */
type GeneratorFn = (root: Point, instance: GeneratorInstance) => void;

type Definition = {
    weight: number;
    generator: GeneratorFn;
};

type SpawnPoint = {
    component: string;
    at: Point;
};

/**
 * A cost function returns the cost of an entire model. The new geometry nodes that were added
 * since the last iteration of generation are passed to the cost function so that, if you can,
 * you can just compute the incremental cost and add it to the previous cost, `instance.getCost()`.
 */
export type CostFn = (instance: GeneratorInstance, nodes: GeometryNode[]) => number;

/**
 * An instance of a generated model, possibly in the middle of generation.
 */
export class GeneratorInstance {
    private model: Model = new Model();
    private generator: Generator;
    private costFn: CostFn;
    private cost: number = 0;
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
     * @returns {number} The current cost of the model the instance has generated so far.
     */
    public getCost(): number {
        return this.cost;
    }

    /**
     * @returns {number} How many spawn points the generator can choose from when growing the
     * next generation.
     */
    public activeSpawnPoints(): number {
        return this.spawnPoints.length;
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
    public advance() {
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

        // Out of the `Node`s that were generated, get the ones that were `GeometryNode`s
        const addedGeometry: GeometryNode[] = [];
        this.model.nodes.slice(originalLength).forEach((node: Node) =>
            node.geometryCallback((g: GeometryNode) => {
                addedGeometry.push(g);
            })
        );

        // Recompute the cost
        this.cost = this.costFn(this, addedGeometry);
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
            this.advance();
        });
    }

    /**
     * Prepares this instance for generation.
     *
     * @param {string} start The name of the rule to start generating from.
     */
    public initialize(start: string) {
        this.cost = 0;

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
 */
export class Generator {
    private rules: { [name: string]: { totalWeight: number; definitions: Definition[] } } = {};
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
            this.rules[name] = { totalWeight: 0, definitions: [] };
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
        const instance = new GeneratorInstance(this, () => 0);
        instance.generate(params);

        return instance.getModel();
    }

    /**
     * Generates a model using the SOSMC algorithm, which samples multiple instances of this
     * generator, favoring ones with a lower cost.
     *
     * @param {string} start The name of the rule to start generating from.
     * @param {number} depth How many iterations to run before stopping.
     * @param {number} samples How many samples to look at in parallel.
     * @param {CostFn} costFn A function used to measure the cost of each sample.
     * @returns {Model} The model that was generated.
     */
    public generateSOSMC(params: {
        start: string;
        depth?: number;
        samples?: number;
        costFn: CostFn;
    }): Model {
        const { start, depth = 10, samples = 50, costFn } = params;
        let instances = range(samples).map(() => new GeneratorInstance(this, costFn));

        // Seed instances with starting state
        instances.forEach((instance: GeneratorInstance) => instance.initialize(start));

        range(depth).forEach((iteration: number) => {
            // Step 1: grow samples
            instances.forEach((instance: GeneratorInstance) => instance.advance());

            // Step 2: if there will be more iterations, do a weighted resample
            if (iteration + 1 !== depth) {
                // We use "weight" here instead of cost to define how likely an instance is to be
                // picked for the next generation. A low cost should give a high weight, and a high
                // cost should give a low weight.

                const totalWeight = instances.reduce(
                    (accum: number, instance: GeneratorInstance) => {
                        // 1 / e^x means that lower (even negative) costs get a higher weight
                        return accum + 1 / Math.exp(instance.getCost());
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
                    let picked: GeneratorInstance | null = null;
                    let i = 0;
                    do {
                        picked = instances[i];
                        sample -= 1 / Math.exp(picked.getCost());
                        i += 1;
                    } while (sample > 0);

                    // Make a new copy of the picked instance that can be grown independently from
                    // the original version.
                    return picked.clone();
                });
            }
        });

        // From the last generation, pick the one with the lowest cost.
        return (<GeneratorInstance>minBy(instances, (instance: GeneratorInstance) =>
            instance.getCost()
        )).getModel();
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
}
