import {
    Armature,
    CostFunction,
    Generator,
    GeneratorInstance,
    Light,
    Material,
    Model,
    Node,
    PerfStats,
    Point,
    Renderer,
    RGBColor,
    Shape
} from '../calder';

import { range } from 'lodash';

// tslint:disable-next-line:import-name
import Bezier = require('bezier-js');

const resultsElement = document.createElement('pre');
const images = document.createElement('table');
const imageRow = document.createElement('tr');
images.appendChild(imageRow);
const labelsRow = document.createElement('tr');
images.appendChild(labelsRow);

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

const generateImage = true;

type ModelAndCost = {
    model: Model;
    cost: number;
};

let lastRun: ModelAndCost[][] = [[], [], []];
const labels = ['No heuristic', 'No heuristic with funnel', 'Heuristic with funnel'];

function runBenchmark() {
    const SAMPLES = 500;
    const samples: SampleType[] = range(SAMPLES * SampleType.SIZE).map((i: number) =>
        Math.floor(i / SAMPLES)
    );
    const results: number[][] = [[], [], []];
    const averages: number[] = [0, 0, 0];

    const models: ModelAndCost[][] = [[], [], []];

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

        if (generateImage) {
            lastRun = models;
        }
    }

    function onComplete(model: Model, { cpuTime }: PerfStats) {
        results[samples[0]].push(lastCost);
        averages[samples[0]] += cpuTime;
        if (generateImage) {
            models[samples[0]].push({ model, cost: lastCost });
        }

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

function combineAndShowModels(modelsForLabels: ModelAndCost[][], n: number) {
    while (imageRow.firstChild !== null) {
        imageRow.removeChild(imageRow.firstChild);
    }
    while (labelsRow.firstChild !== null) {
        labelsRow.removeChild(labelsRow.firstChild);
    }

    combineModels(modelsForLabels, n).forEach((canvas: HTMLCanvasElement, i: number) => {
        const imageCell = document.createElement('td');
        imageCell.appendChild(canvas);
        imageRow.appendChild(imageCell);

        const labelCell = document.createElement('td');
        labelCell.innerText = labels[i];
        labelsRow.appendChild(labelCell);
    });
}

function blendImageData(ctx: CanvasRenderingContext2D, data: ImageData) {
    const scratch: HTMLCanvasElement = document.createElement('canvas');
    scratch.width = data.width;
    scratch.height = data.height;
    const ctx2 = <CanvasRenderingContext2D>scratch.getContext('2d');
    ctx2.putImageData(data, 0, 0);
    ctx.drawImage(scratch, 0, 0);
}

function combineModels(modelsForLabels: ModelAndCost[][], n: number) {
    const ambientLightColor = RGBColor.fromRGB(90, 90, 90);
    const renderer: Renderer = new Renderer({
        width: 400,
        height: 400,
        maxLights: 2,
        ambientLightColor,
        backgroundColor: RGBColor.fromHex('#FFDDFF'),
        willReadPixels: true
    });

    // Create light sources for the renderer
    const light1: Light = Light.create({
        position: { x: 10, y: 10, z: 10 },
        color: RGBColor.fromHex('#FFFFFF'),
        strength: 200
    });
    renderer.addLight(light1);

    renderer.camera.lookAt({ x: 0, y: 0, z: -1 });
    renderer.camera.moveToWithFixedTarget({ x: 0, y: 0, z: 0 });
    renderer.camera.moveTo({ x: 0, y: 2, z: 10 });

    const guidingCurves = CostFunction.guidingVectors(curves)
        .generateGuidingCurve()
        .map((path: [number, number, number][], index: number) => {
            return {
                path,
                selected: true,
                bezier: curves[index].bezier
            };
        });

    const results = modelsForLabels.map((models: ModelAndCost[]) => {
        const avg =
            models.reduce((sum: number, m: ModelAndCost) => {
                return sum + m.cost;
            }, 0) / models.length;

        models.sort(
            (a: ModelAndCost, b: ModelAndCost) => Math.abs(a.cost - avg) - Math.abs(b.cost - avg)
        );
        const middle = models.slice(0, n);

        const combined: HTMLCanvasElement = document.createElement('canvas');
        combined.width = 400;
        combined.height = 400;
        const ctx = <CanvasRenderingContext2D>combined.getContext('2d');
        ctx.globalCompositeOperation = 'lighter';

        middle.forEach((modelAndCost: ModelAndCost) => {
            renderer.draw([modelAndCost.model], { drawGuidingCurve: guidingCurves });
            const rawPixels = renderer.getPixelData();
            const pixels = new Uint8ClampedArray(rawPixels.length);

            // Give each image an alpha such that they all sum to opaque
            for (let x = 0; x < renderer.width; x += 1) {
                for (let y = 0; y < renderer.height; y += 1) {
                    const flippedY = renderer.height - 1 - y;
                    [0, 1, 2].forEach(
                        (channel: number) =>
                            (pixels[(flippedY * renderer.width + x) * 4 + channel] =
                                rawPixels[(y * renderer.width + x) * 4 + channel])
                    );

                    // Give each image an alpha such that they all sum to opaque
                    pixels[(flippedY * renderer.width + x) * 4 + 3] = 255 / middle.length;
                }
            }

            const imageData = new ImageData(pixels, renderer.width, renderer.height);

            blendImageData(ctx, imageData);
        });

        return combined;
    });

    renderer.destroy();

    return results;
}

const perfButton = document.createElement('button');
perfButton.innerText = 'Benchmark heuristic';
perfButton.addEventListener('click', runBenchmark);

const numImages = document.createElement('input');
numImages.setAttribute('type', 'number');
numImages.setAttribute('step', '1');
numImages.value = '5';

const combineButton = document.createElement('button');
combineButton.innerText = 'Combine images';
combineButton.addEventListener('click', () => {
    combineAndShowModels(lastRun, parseInt(numImages.value, 10));
});

document.body.appendChild(perfButton);
document.body.appendChild(combineButton);
document.body.appendChild(numImages);
document.body.appendChild(resultsElement);
document.body.appendChild(images);
