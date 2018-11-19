import { RandomGenerator } from '../utils/random';
import { Model } from './Model';
import { Node, Point } from './Node';

import { minBy, range } from 'lodash';
import { Task } from '../utils/Task';

// tslint:disable no-use-before-declare

/**
 * A function to generate a component from a spawn point. These are the body of rule definitions.
 */
type GeneratorFn = (root: Point) => void;

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
    getCost(instance: GeneratorInstance, nodes: Node[], useHeuristic: boolean): Cost;
}

/**
 * An instance of a generated model, possibly in the middle of generation.
 */
export class GeneratorInstance {
    public readonly generator: Generator;
    private model: Model = new Model();
    private costFn: CostFn;
    private cost: Cost = emptyCost;
    private probability: number = 1;
    private skeletonSpawnPoints: SpawnPoint[] = [];
    private postSkeletonSpawnPoints: SpawnPoint[] = [];
    private decorateCallbacks: (() => void)[] = [];
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
     * Allows a callback to be run after optimization is done, allowing it
     * to not affect on optimization.
     */
    public decorate(callback: () => void) {
        this.decorateCallbacks.push(callback);
    }

    public hasDecorateCallbacks() {
        return this.decorateCallbacks.length > 0;
    }

    public runDecorateCallback() {
        const callback = this.decorateCallbacks.pop();
        if (callback !== undefined) {
            Generator.withContext(this, callback);
        }
    }

    /**
     * @returns {GeneratorInstance} A flat copy of this generator instance.
     */
    public clone(): GeneratorInstance {
        const cloned = new GeneratorInstance(this.generator, this.costFn);
        cloned.model = this.model.clone();
        cloned.cost = this.cost;
        cloned.probability = this.probability;
        cloned.skeletonSpawnPoints = [...this.skeletonSpawnPoints];
        cloned.postSkeletonSpawnPoints = [...this.postSkeletonSpawnPoints];
        cloned.decorateCallbacks = [...this.decorateCallbacks];

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
        return this.skeletonSpawnPoints;
    }

    /**
     * @returns {SpawnPoint[]} The spawn points that are to be used after optimization is completed.
     */
    public getPostSkeletonSpawnPoints(): SpawnPoint[] {
        return this.postSkeletonSpawnPoints;
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
    public getCostWeight(heuristicScale: number): number {
        // 1 / e^x means that lower (even negative) costs get a higher weight.
        // Using 1/ e^x instead of e^(-x) for numerical stability.
        return 1 / Math.exp(this.cost.realCost + this.cost.heuristicCost * heuristicScale);
    }

    /**
     * @returns {number} The probability of this sample, used for importance sampling.
     */
    public getProbability(): number {
        return this.probability;
    }

    /**
     * @returns {number} The non-normalized weight of this sample, as a product of its probability
     * and the cost (used as a likelihood function.)
     */
    public getWeight(heuristicScale: number = 150): number {
        return this.getProbability() * this.getCostWeight(heuristicScale);
    }

    /**
     * Tells the generator that more components can be generated somewhere.
     *
     * @param {SpawnPoint} spawnPoint The name of the component to spawn and the point at which to
     * spawn it.
     */
    public addDetail(spawnPoint: SpawnPoint) {
        if (this.generator.postSkeletonComponentNames.has(spawnPoint.component)) {
            this.postSkeletonSpawnPoints.push(spawnPoint);
        } else {
            this.skeletonSpawnPoints.push(spawnPoint);
        }
    }

    /**
     * Grows this instance, if possible, until a new shape is added.
     */
    public growIfPossible(
        skeleton: boolean,
        useHeuristic: boolean = false,
        onAdded?: (nodes: Node[]) => void
    ) {
        Generator.withContext(this, () => {
            const originalLength = this.model.nodes.length;

            let choiceProbability = 1;

            const spawnPoints = skeleton ? this.skeletonSpawnPoints : this.postSkeletonSpawnPoints;

            while (this.model.nodes.length === originalLength && spawnPoints.length > 0) {
                // Remove a random spawn point from the list of active points, updating the probability
                // given the number of choices we have
                choiceProbability /= spawnPoints.length;
                const spawnPoint = spawnPoints.splice(
                    Math.floor(this.random() * spawnPoints.length),
                    1
                )[0];

                // Get a definition for the rule at the picked spawn point
                const generator = this.generator.getGenerator(spawnPoint.component);

                // Add things to the model using the rule definition
                generator(spawnPoint.at);
            }

            // Get the new nodes that were added
            const added = this.model.nodes.slice(originalLength);

            if (onAdded !== undefined) {
                onAdded(added);
            }

            // Recompute the cost
            this.cost = this.costFn.getCost(this, added, useHeuristic);

            // Update probability
            this.probability *= choiceProbability;
        });
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
            this.growIfPossible(true);
        });

        // Grow all non-skeleton spawn points
        while (this.skeletonSpawnPoints.length > 0) {
            const spawnPoint: SpawnPoint = <SpawnPoint>this.skeletonSpawnPoints.pop();
            // TODO: Throw an error if generator function not found in `wrapUpRules`
            Generator.withContext(this, () => {
                this.generator.wrapUpRules[spawnPoint.component](spawnPoint.at);
            });
        }

        while (this.postSkeletonSpawnPoints.length > 0 || this.hasDecorateCallbacks()) {
            while (this.postSkeletonSpawnPoints.length > 0) {
                this.growIfPossible(false);
            }

            while (this.hasDecorateCallbacks()) {
                this.runDecorateCallback();
            }
        }
    }

    /**
     * Prepares this instance for generation.
     *
     * @param {string} start The name of the rule to start generating from.
     */
    public initialize(start: string) {
        this.cost = emptyCost;

        // Clear spawn points
        this.skeletonSpawnPoints.length = 0;
        this.postSkeletonSpawnPoints.length = 0;

        // Create initial spawn point
        this.model = new Model([new Node()]);
        this.model.root().createPoint('spawn', { x: 0, y: 0, z: 0 });
        this.addDetail({ component: start, at: this.model.root().point('spawn') });
    }
}

type SOSMCParams = {
    start: string;
    sosmcDepth?: number;
    samples?: number | ((generation: number) => number);
    costFn: CostFn;
    heuristicScale?: number | ((generation: number) => number);

    /**
     * For debugging, a callback can be passed in so that every sample in the final
     * generation can be examined.
     */
    iterationHook?: (instances: GeneratorInstance[]) => void;

    timeBudget?: number;
};

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
    private static currentContext: GeneratorInstance | null = null;

    public readonly wrapUpRules: { [name: string]: GeneratorFn } = {};
    public readonly postSkeletonComponentNames: Set<string> = new Set<string>();
    private rules: { [name: string]: RuleInfo } = {};
    private random: RandomGenerator = Math.random;

    /**
     * @returns {GeneratorInstance} The instance currently being operated on.
     * @throws {Error} if there is no current context (i.e. if this is called outside of
     * a rule definition.)
     */
    public static context(): GeneratorInstance {
        const context = Generator.currentContext;
        if (context === null) {
            throw new Error('Generator context has not been set!');
        }

        return context;
    }

    /**
     * @returns {GeneratorInstance | null} The instance currently being operated on, if it
     * exists, or null if there is no active context.
     */
    public static maybeContext(): GeneratorInstance | null {
        return Generator.currentContext;
    }

    /**
     * @param {SpawnPoint} spawnPoint A spawn point to add to the current instance.
     * @throws {Error} if there is no current context (i.e. if this is called outside of
     * a rule definition.)
     */
    public static addDetail(spawnPoint: SpawnPoint) {
        Generator.context().addDetail(spawnPoint);
    }

    public static decorate(callback: () => void) {
        Generator.context().decorate(callback);
    }

    /**
     * Calls within the callback passed to `withContext` will be able to refer to `instance` using
     * `Generator.context()` or `Generator.maybeContext()` without needing to reference the
     * instance directly. Nested calls work like a stack, where the previous state is restored
     * after each call finishes.
     *
     * @param {GeneratorInstance | null} instance The instance to use as the context for some work.
     * @param {() => void} callback Work to do on the given instance.
     */
    public static withContext(instance: GeneratorInstance | null, callback: () => void) {
        const lastContext = Generator.currentContext;
        Generator.currentContext = instance;

        callback();

        Generator.currentContext = lastContext;
    }

    /**
     * Defines a generator function that adds a component with `name` at the root of the spawn
     * point.
     *
     * @param {string} name The name of the component being generated.
     * @returns {Generator} The current generator, so that more methods can be chained.
     */
    public static replaceWith(name: string): GeneratorFn {
        return (root: Point) => {
            Generator.context().addDetail({ component: name, at: root });
        };
    }

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
     * Replaces the rule for a component `name` to be `generator` instead of its initial definition.
     * The `name` should also be used in `thenComplete`.
     *
     * @param {string} name The name of a defined component.
     * @param {GeneratorFn} generator A function that takes in a spawn point and generates
     * geometry at that point.
     * @returns {Generator} The current generator, so that more methods can be chained.
     */
    public wrapUp(name: string, generator: GeneratorFn): Generator {
        this.wrapUpRules[name] = generator;

        return this;
    }

    /**
     * Calls `wrapUp` on the components in the `names` list to replace the rules to with `generator`.
     *
     * @param {string[]} names A list of component names that were previously defined.
     * @param {GeneratorFn} generator A function that takes in a spawn point and generates
     * geometry at that point.
     * @returns {Generator} The current generator, so that more methods can be chained.
     */
    public wrapUpMany(names: string[], generator: GeneratorFn): Generator {
        names.forEach((name: string) => {
            this.wrapUp(name, generator);
        });

        return this;
    }

    /**
     * Terminates a the generation by adding defined components to the remaining spawn points.
     *
     * @param {string[]} componentNames The names of the components that can be created at a spawn
     * point.
     * @returns {Generator} The current generator, so that more methods can be chained.
     */
    public thenComplete(componentNames: string[]): Generator {
        this.postSkeletonComponentNames.clear();

        componentNames.forEach((name: string) => {
            this.postSkeletonComponentNames.add(name);
        });

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
     * @param {number | ((generation: number) => number)} samples How many samples to look at in
     * parallel.
     * @param {CostFn} costFn A function used to measure the cost of each sample.
     * @param {number | ((generation: number) => number)} heuristicScale A multiplier for the
     * heuristic in each generation.
     * @returns {GeneratorTask} A task to keep track of progress and get the result from.
     */
    public generateSOSMC(
        params: SOSMCParams,
        timeBudget: number = 1 / 60
    ): Task<Model, GeneratorInstance> {
        return new Task<Model, GeneratorInstance>(
            this.generateSOSMCIterator(params),
            timeBudget,
            requestAnimationFrame,
            Generator.withContext,
            Generator.maybeContext
        );
    }

    // https://i.imgur.com/1ebOP1Y.jpg
    // The star here means this is actually a generator function that returns a coroutine. Every
    // `yield` is a point where we can pause execution and resume it in the next frame if we've
    // gone over our framely time budget.
    //
    // The returned iterator's `next()` will return a `Model` if the optimization is complete,
    // or `undefined` if it is still underway.
    public *generateSOSMCIterator(params: SOSMCParams): IterableIterator<Model | undefined> {
        const {
            start,
            sosmcDepth = 10,
            samples = 50,
            costFn,
            heuristicScale = 0,
            iterationHook
        } = params;
        const getSamples = (generation: number) =>
            samples instanceof Function ? samples(generation) : samples;
        const getHeuristicScale = (generation: number) =>
            heuristicScale instanceof Function ? heuristicScale(generation) : heuristicScale;

        let instances = range(getSamples(0)).map(() => new GeneratorInstance(this, costFn));

        // Seed instances with starting state
        instances.forEach((instance: GeneratorInstance) => instance.initialize(start));

        for (let iteration = 0; iteration < sosmcDepth; iteration += 1) {
            // Linearly interpolate between the initial and final scale values
            const currentHeuristicScale = getHeuristicScale(iteration);
            const useHeuristic = currentHeuristicScale > 0;

            // Step 1: grow samples
            for (const instance of instances) {
                instance.growIfPossible(true, useHeuristic);
                yield undefined;
            }

            // Step 2: if there will be more iterations, do a weighted resample
            if (iteration + 1 !== sosmcDepth) {
                // We use "weight" here instead of cost to define how likely an instance is to be
                // picked for the next generation. A low cost should give a high weight, and a high
                // cost should give a low weight.

                const totalWeight = instances.reduce(
                    (accum: number, instance: GeneratorInstance) => {
                        return accum + instance.getWeight(currentHeuristicScale);
                    },
                    0
                );

                // Re-pick instances from the previous set, according to their weights
                instances = range(getSamples(iteration + 1)).map(() => {
                    // Generate a random number in [0, totalWeight)
                    let sample = this.random() * totalWeight;

                    // Subtract each instance's weight from the generated number until it reaches
                    // zero. The instance to make it reach zero is the instance corresponding to
                    // the random number we generated.
                    let picked: GeneratorInstance = instances[0];
                    let i = 0;
                    while (sample > 0 && i < instances.length - 1) {
                        picked = instances[i];
                        sample -= instances[i].getWeight(currentHeuristicScale);
                        i += 1;
                    }

                    // Make a new copy of the picked instance that can be grown independently from
                    // the original version.
                    return picked.clone();
                });
            }

            if (iterationHook !== undefined) {
                iterationHook(instances);
            }
        }

        // From the last generation, pick the one with the lowest cost.
        const finalInstance = <GeneratorInstance>minBy(instances, (instance: GeneratorInstance) =>
            instance.getCost()
        );

        while (finalInstance.getSpawnPoints().length > 0) {
            Generator.withContext(finalInstance, () => {
                const spawnPoint: SpawnPoint = <SpawnPoint>finalInstance.getSpawnPoints().pop();
                this.wrapUpRules[spawnPoint.component](spawnPoint.at);
            });
            yield undefined;
        }

        // Run this in a loop because decoration callbacks may add post skeleton spawn points
        while (
            finalInstance.getPostSkeletonSpawnPoints().length > 0 ||
            finalInstance.hasDecorateCallbacks()
        ) {
            while (finalInstance.getPostSkeletonSpawnPoints().length > 0) {
                finalInstance.growIfPossible(false, false);
                yield undefined;
            }

            while (finalInstance.hasDecorateCallbacks()) {
                finalInstance.runDecorateCallback();
                yield undefined;
            }
        }

        yield finalInstance.getModel();
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
