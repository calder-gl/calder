import {
    Armature,
    CostFunction,
    Generator,
    GeneratorInstance,
    GeneratorStats,
    GuidingCurveInfo,
    Light,
    Material,
    Model,
    Node,
    Point,
    Renderer,
    RGBColor,
    Shape
} from '../calder';

// tslint:disable-next-line:import-name
import Bezier = require('bezier-js');

// Create the renderer
const ambientLightColor = RGBColor.fromRGB(90, 90, 90);
const renderer: Renderer = new Renderer({
    width: 800,
    height: 600,
    maxLights: 2,
    ambientLightColor,
    backgroundColor: RGBColor.fromHex('#FFDDFF')
});

// Create light sources for the renderer
const light1: Light = Light.create({
    position: { x: 10, y: 10, z: 10 },
    color: RGBColor.fromHex('#FFFFFF'),
    strength: 200
});

// Add lights to the renderer
renderer.addLight(light1);

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 1: create geometry
///////////////////////////////////////////////////////////////////////////////////////////////////

// Setup leaf
const leafColor = RGBColor.fromRGB(204, 255, 204);
const leafSphere = Shape.sphere(Material.create({ color: leafColor, shininess: 100 }));

// Setup branch
const branchColor = RGBColor.fromRGB(102, 76.5, 76.5);
const branchShape = Shape.cylinder(Material.create({ color: branchColor, shininess: 1 }));

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 2: create armature
///////////////////////////////////////////////////////////////////////////////////////////////////

const bone = Armature.define((root: Node) => {
    root.createPoint('base', { x: 0, y: 0, z: 0 });
    root.createPoint('mid', { x: 0, y: 0.5, z: 0 });
    root.createPoint('tip', { x: 0, y: 1, z: 0 });
    root.createPoint('handle', { x: 1, y: 0, z: 0 });
});

const treeGen = Armature.generator();
treeGen
    .define('branch', (root: Point, instance: GeneratorInstance) => {
        const node = instance.add(bone());
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

        const trunk = instance.add(node.point('mid').attach(branchShape));
        trunk.scale({ x: 0.2, y: 1, z: 0.2 });

        instance.addDetail({ component: 'branchOrLeaf', at: node.point('tip') });
    })
    .defineWeighted('branchOrLeaf', 1, (root: Point, instance: GeneratorInstance) => {
        instance.addDetail({ component: 'leaf', at: root });
    })
    .defineWeighted('branchOrLeaf', 4, (root: Point, instance: GeneratorInstance) => {
        instance.addDetail({ component: 'branch', at: root });
        instance.addDetail({ component: 'maybeBranch', at: root });
        instance.addDetail({ component: 'maybeBranch', at: root });
    })
    .define('leaf', (root: Point, instance: GeneratorInstance) => {
        const leaf = instance.add(root.attach(leafSphere));
        leaf.scale(Math.random() * 0.5 + 0.5);
    })
    .maybe('maybeBranch', (root: Point, instance: GeneratorInstance) => {
        instance.addDetail({ component: 'branch', at: root });
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
        alignmentMultiplier: 500,
        alignmentOffset: 0.7
    },
    {
        bezier: new Bezier([
            { x: 0, y: 1, z: 0 },
            { x: 0.5, y: 2, z: 1 },
            { x: 0, y: 3, z: 1 },
            { x: 0, y: 3, z: 2 }
        ]),
        distanceMultiplier: scale,
        alignmentMultiplier: 500,
        alignmentOffset: 0.6
    }
];
const guidingVectors = CostFunction.guidingVectors(curves);

const vectorField = guidingVectors.generateVectorField();
const guidingCurves = guidingVectors.generateGuidingCurve().map((path: [number, number, number][], index: number) => {
    return {
        path,
        selected: false,
        bezier: curves[index].bezier
    };
});

renderer.stage.addEventListener('click', (event: MouseEvent) => {
    const boundingRect = renderer.stage.getBoundingClientRect();
    const selectedIndex = renderer.findCurveUnderCursor(
        guidingCurves,
        {
            x: event.clientX - boundingRect.left,
            y: event.clientY - boundingRect.top
        }
    );

    guidingCurves.forEach((curve: GuidingCurveInfo, index: number) => {
        curve.selected = index === selectedIndex;
    });
});

const result = document.createElement('p');
result.style.display = 'none';

const generationInstances: GeneratorInstance[][] = [];

const time = document.createElement('p');

let tree: Model | null = null;
treeGen
    .generateSOSMC(
        {
            start: 'branch',
            sosmcDepth: 100,
            samples: (generation: number) => 80 - generation / 100 * 70,
            heuristicScale: (generation: number) => {
                if (generation <= 50) {
                    return 0.01 - generation / 50 * 0.01;
                } else {
                    return 0;
                }
            },
            costFn: guidingVectors,
            iterationHook: (instances: GeneratorInstance[]) => generationInstances.push(instances)
        },
        1 / 30
    )
    .then((model: Model, { realTime, cpuTime }: GeneratorStats) => {
        tree = model;
        time.innerText = `Generated in ${realTime.toFixed(4)}s real time, ${cpuTime.toFixed(
            4
        )}s CPU time`;
    });

result.innerText = '';

// Display the best cost instances from the best generation.
generationInstances.forEach((instances: GeneratorInstance[], index: number) => {
    result.innerText += `Generation (${index}) costs: `;
    result.innerText += instances
        .map((instance: GeneratorInstance) => instance.getCost().realCost)
        .sort((a: number, b: number) => a - b)
        .map((cost: number) => Math.round(cost * 100) / 100)
        .join(', ');
    result.innerText += '\n\n';
});

document.body.appendChild(result);

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 3: set up renderer
///////////////////////////////////////////////////////////////////////////////////////////////////

document.body.appendChild(renderer.stage);
document.body.appendChild(time);

renderer.camera.lookAt({ x: 0, y: 1, z: 0 });

// Draw the armature
let angle = 0;
const draw = () => {
    angle += 0.001;
    renderer.camera.moveToWithFixedTarget({
        x: Math.cos(angle) * 8,
        y: 1,
        z: -Math.sin(angle) * 8
    });
    //tree.root().setRotation(Matrix.fromQuat4(Quaternion.fromEuler(0, angle, 0)));

    return {
        objects: tree === null ? [] : [tree],
        debugParams: {
            drawAxes: true,
            drawArmatureBones: false,
            drawVectorField: vectorField,
            drawGuidingCurve: guidingCurves
        }
    };
};

// Apply the constraints each frame.
renderer.eachFrame(draw);

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 4: add .obj export
///////////////////////////////////////////////////////////////////////////////////////////////////

const exportBtn = document.createElement('button');
exportBtn.innerText = 'Export .obj';
exportBtn.addEventListener('click', () => {
    if (tree === null) {
        return;
    }

    const obj = tree.exportOBJ('calderExport', ambientLightColor);

    const link = document.createElement('a');
    link.style.display = 'none';
    document.body.appendChild(link);

    // Download obj
    link.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(obj.obj)}`);
    link.setAttribute('download', 'calderExport.obj');
    link.click();

    // Download mtl
    link.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(obj.mtl)}`);
    link.setAttribute('download', 'calderExport.mtl');
    link.click();

    document.body.removeChild(link);
});
document.body.appendChild(exportBtn);
