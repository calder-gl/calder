import { RandomGenerator } from '../utils/random';
import { Model } from './Model';
import { Node, Point } from './Node';

import { minBy, range } from 'lodash';

type GeneratorFn = (root: Point, instance: GeneratorInstance) => void;

type Definition = {
    weight: number;
    generator: GeneratorFn;
};

type SpawnPoint = {
    component: string;
    at: Point;
};

export type CostFn = (node: Node) => number;

export class GeneratorInstance {
    private model: Model = new Model();
    private generator: Generator;
    private costFn: CostFn;
    private cost: number = 0;
    private spawnPoints: SpawnPoint[] = [];
    private random: RandomGenerator = Math.random;

    constructor(generator: Generator, costFn: CostFn) {
        this.generator = generator;
        this.costFn = costFn;
    }

    public add(node: Node): Node {
        return this.model.add(node);
    }

    public clone(): GeneratorInstance {
        const cloned = new GeneratorInstance(this.generator, this.costFn);
        cloned.model = this.model.clone();
        cloned.cost = this.cost;
        cloned.spawnPoints = [...this.spawnPoints];

        return cloned;
    }

    public getModel(): Model {
        return this.model;
    }

    public getCost(): number {
        return this.cost;
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

    public advance() {
        let incrementalCost = 0;
        let addedShape = false;

        while (!addedShape && this.spawnPoints.length > 0) {
            const spawnPoint = this.spawnPoints.splice(Math.floor(this.random() * this.spawnPoints.length), 1)[0];
            const onAddCallback = (node: Node) => {
                addedShape = true;
                incrementalCost += this.costFn(node);
            };
            spawnPoint.at.onAdd(onAddCallback);

            const generator = this.generator.getGenerator(spawnPoint.component);
            generator(spawnPoint.at, this);

            spawnPoint.at.removeOnAdd(onAddCallback);
        }

        this.cost += incrementalCost;
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

    public initialize(start: string) {
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
    public defineWeighted(
        name: string,
        weight: number,
        generator: GeneratorFn
    ): Generator {
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

    public generate(params: { start: string; depth?: number }): Model {
        const instance = new GeneratorInstance(this, () => 0);
        instance.generate(params);

        return instance.getModel();
    }

    public generateSOMC(params: { start: string; depth?: number; samples?: number; costFn: CostFn }): Model {
        const { start, depth = 10, samples = 50, costFn } = params;
        let instances = range(samples).map(() => new GeneratorInstance(this, costFn));

        // Seed instances with starting state
        instances.forEach((instance: GeneratorInstance) => instance.initialize(start));

        range(depth).forEach((iteration: number) => {
            // Step 1: grow samples
            instances.forEach((instance: GeneratorInstance) => instance.advance());

            // Step 2: if there will be more iterations, do a weighted resample
            if (iteration + 1 !== depth) {
                const total = instances.reduce((accum: number, instance: GeneratorInstance) => {
                    return accum + 1/instance.getCost();
                }, 0);
                instances = instances.map(() => {
                    let sample = this.random() * total;
                    let picked: GeneratorInstance | null = null;
                    let i = 0;
                    do {
                        picked = instances[i];
                        sample -= 1/picked.getCost();
                        i += 1;
                    } while (sample > 0);

                    return picked.clone();
                });
            }
        });

        return (<GeneratorInstance> minBy(instances, (instance: GeneratorInstance) => instance.getCost())).getModel();
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
