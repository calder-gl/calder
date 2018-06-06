import { vec3 } from 'gl-matrix';
import { Node, Point } from './Node';

type Definition = {
    weight: number;
    generator(root: Point);
};

type SpawnPoint = {
    rule: string;
    at: Point;
};

export class Generator {
    private rules: { [name: string]: { totalWeight: number; definitions: Definition[] } } = {};
    private spawnPoints: SpawnPoint[] = [];
    private nextSpawnPoints: SpawnPoint[] = [];

    public define(name: string, weight: number, generator: (root: Point) => void): Generator {
        if (this.rules[name] === undefined) {
            this.rules[name] = { totalWeight: 0, definitions: [] };
        }

        this.rules[name].totalWeight += weight;
        this.rules[name].definitions.push({ weight, generator });

        return this;
    }

    public addDetail(spawnPoint: SpawnPoint) {
        this.nextSpawnPoints.push(spawnPoint);
    }

    public generate({start, depth = 50}: {start: string; depth?: number}): Node {
        const root = new Node();
        root.createPoint('spawn', vec3.fromValues(0, 0, 0));
        this.addDetail({rule: start, at: root.point('spawn')});
        this.cycleSpawnPoints();

        for (let i = 0; this.spawnPoints.length > 0 && i < depth; i += 1, this.cycleSpawnPoints()) {
            const spawnPoint = this.spawnPoints[0];
            this.spawnPoints.shift();
            const generator = this.getGenerator(spawnPoint.rule);

            generator(spawnPoint.at);
        }

        return root;
    }

    private cycleSpawnPoints() {
        this.spawnPoints.length = 0;
        this.spawnPoints.push(...this.nextSpawnPoints.splice(0, this.nextSpawnPoints.length));
    }

    private getGenerator(rule: string): (root: Point) => void {
        if (this.rules[rule] === undefined) {
            throw new Error(`Cannot find definition for rule "${rule}"`);
        }

        const value = Math.random() * this.rules[rule].totalWeight;
        let weight = 0;
        for (const definition of this.rules[rule].definitions) {
            weight += definition.weight;
            if (weight >= value) {
                return definition.generator;
            }
        }

        throw new Error('Error finding a weighted definition. Are all weights positive?');
    }
}
