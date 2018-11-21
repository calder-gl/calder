import {
    Armature,
    CostFunction,
    Generator,
    GeneratorInstance,
    Material,
    Model,
    Node,
    PerfStats,
    Point,
    RGBColor,
    Shape
} from '../calder';

import { range } from 'lodash';

// tslint:disable-next-line:import-name
import Bezier = require('bezier-js');

const resultsElement = document.createElement('pre');

// Setup leaf
const leafColor = RGBColor.fromRGB(204, 255, 204);
const leafSphere = Shape.sphere(Material.create({ color: leafColor, shininess: 100 }));

// Setup branch
const branchColor = RGBColor.fromRGB(102, 76.5, 76.5);
const branchShape = Shape.cylinder(Material.create({ color: branchColor, shininess: 1 }));

const bone = Armature.define((root: Node) => {
    root.createPoint('base', { x: 0, y: 0, z: 0 });
    root.createPoint('mid', { x: 0, y: 0.5, z: 0 });
    root.createPoint('tip', { x: 0, y: 1, z: 0 });
    root.createPoint('handle', { x: 1, y: 0, z: 0 });
});

const treeGen = Armature.generator();
treeGen
    .define('branch', (root: Point) => {
        const node = bone();
        node.point('base').stickTo(root);
        node.scale(Math.random() * 0.4 + 0.9);
        node
            .hold(node.point('tip'))
            .rotate(Math.random() * 360)
            .release();
        node
            .hold(node.point('handle'))
            .rotate(Math.random() * 70)
            .release();
        node.scale(0.8); // Shrink a bit

        const trunk = node.point('mid').attach(branchShape);
        trunk.scale({ x: 0.2, y: 1, z: 0.2 });

        Generator.addDetail({ component: 'branchOrLeaf', at: node.point('tip') });
    })
    .defineWeighted('branchOrLeaf', 1, (root: Point) => {
        Generator.addDetail({ component: 'leaf', at: root });
    })
    .defineWeighted('branchOrLeaf', 4, (root: Point) => {
        Generator.addDetail({ component: 'branch', at: root });
        Generator.addDetail({ component: 'maybeBranch', at: root });
        Generator.addDetail({ component: 'maybeBranch', at: root });
    })
    .define('leaf', (root: Point) => {
        const leaf = root.attach(leafSphere);
        leaf.scale(Math.random() * 0.5 + 0.5);
    })
    .maybe('maybeBranch', (root: Point) => {
        Generator.addDetail({ component: 'branch', at: root });
    })
    .wrapUpMany(['branch', 'branchOrLeaf', 'maybeBranch'], Generator.replaceWith('leaf'))
    .thenComplete(['leaf']);

const scale: [number, number, number] = [0, 0, 100];
const curves = [
    {
        bezier: new Bezier([
            { x: 0, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 },
            { x: 1, y: 1, z: 1 },
            { x: 2, y: 2, z: 1 }
        ]),
        distanceMultiplier: scale,
        alignmentMultiplier: 400,
        alignmentOffset: 0.6
    },
    {
        bezier: new Bezier([
            { x: 0, y: 1, z: 0 },
            { x: 0.5, y: 2, z: 1 },
            { x: 0, y: 3, z: 1 },
            { x: 0, y: 3, z: 2 }
        ]),
        distanceMultiplier: scale,
        alignmentMultiplier: 400,
        alignmentOffset: 0.6
    }
];

enum SampleType {
    NoHeuristic = 0,
    NoHeuristicFunneled,
    Heuristic,
    SIZE
}

function runBenchmark() {
    const SAMPLES = 500;
    const samples: SampleType[] = range(SAMPLES * SampleType.SIZE).map((i: number) =>
        Math.floor(i / SAMPLES)
    );
    const results: number[][] = [[], [], []];
    const averages: number[] = [0, 0, 0];
    const labels = ['No heuristic', 'No heuristic with funnel', 'Heuristic with funnel'];

    let lastCost: number = 0;

    function reportResults() {
        resultsElement.innerText = 'Times:\n';
        range(SampleType.SIZE).forEach(
            (i: number) => (resultsElement.innerText += `${labels[i]}: ${averages[i].toFixed(4)}\n`)
        );
        resultsElement.innerText += '\n';
        range(SampleType.SIZE).forEach(
            (i: number) => (resultsElement.innerText += `${results[i].join(',')}\n`)
        );
    }

    function onComplete(_: Model, { cpuTime }: PerfStats) {
        results[samples[0]].push(lastCost);
        averages[samples[0]] += cpuTime;

        samples.shift();
        if (samples.length > 0) {
            nextIteration();
        } else {
            range(SampleType.SIZE).forEach((i: number) => (averages[i] /= SAMPLES));
            reportResults();
        }
    }

    function nextIteration() {
        treeGen
            .generateSOSMC(
                {
                    start: 'branch',
                    sosmcDepth: 100,
                    samples: (generation: number) => {
                        // Use a different funnel with/without the heuristic to fit into 200ms
                        if (samples[0] === SampleType.Heuristic) {
                            return 100 - generation / 100 * 90;
                        } else if (samples[0] === SampleType.NoHeuristicFunneled) {
                            return 110 - generation / 100 * 40;
                        } else {
                            return 85;
                        }
                    },
                    heuristicScale: (generation: number) => {
                        if (samples[0] === SampleType.Heuristic) {
                            // Ramp the heuristic scale down as we get to the final generation
                            if (generation <= 50) {
                                return 0.016 - generation / 50 * 0.016;
                            } else {
                                return 0;
                            }
                        } else {
                            return 0;
                        }
                    },
                    costFn: CostFunction.guidingVectors(curves),
                    iterationHook: (instances: GeneratorInstance[]) => {
                        // Keep track of the lowest cost model. This will be overwritten each iteration,
                        // and then when the whole model is done, the last value will be the final
                        // real cost of the model for this sample.
                        lastCost = Math.min(
                            ...instances.map(
                                (instance: GeneratorInstance) => instance.getCost().realCost
                            )
                        );
                        resultsElement.innerText = `${
                            samples.length
                        } samples left (currently in group ${samples[0]})`;
                    }
                },
                1 / 30
            )
            .then(onComplete);
    }

    nextIteration();
}

const perfButton = document.createElement('button');
perfButton.innerText = 'Benchmark heuristic';
perfButton.addEventListener('click', runBenchmark);

document.body.appendChild(perfButton);
document.body.appendChild(resultsElement);
