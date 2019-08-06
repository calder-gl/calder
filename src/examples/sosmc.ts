import {
    Armature,
    CostFunction,
    Generator,
    GeneratorInstance,
    GeometryNode,
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
    width: 500,
    height: 400,
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
const leafSphere: Node = new GeometryNode(
    Shape.sphere(Material.create({ color: leafColor, shininess: 100 }))
);
const leafModel = new Model([leafSphere]);

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

        Generator.decorate(() => {
            const trunk = node.point('mid').attach(branchShape);
            trunk.scale({ x: 0.2, y: 1, z: 0.2 });
        });

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
        const leaf = root.attachModel(leafModel);
        leaf.scale(0.7);
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
            { x: 1, y: 2, z: 0 },
            { x: 2, y: 2.5, z: 0 }
        ]),
        distanceMultiplier: scale,
        alignmentMultiplier: 600,
        alignmentOffset: 0.7
    }
];
const guidingVectors = CostFunction.guidingVectors(curves);

const guidingCurves = guidingVectors
    .generateGuidingCurve()
    .map((path: [number, number, number][], index: number) => {
        return {
            path,
            selected: true,
            bezier: curves[index].bezier
        };
    });

const result = document.createElement('p');
result.style.display = 'none';

const generationInstances: GeneratorInstance[][] = [];

const showBones = document.createElement('p');
showBones.innerText = 'Show bones? ';
const drawArmatureBones = document.createElement('input');
drawArmatureBones.setAttribute('type', 'checkbox');
drawArmatureBones.checked = true;
showBones.appendChild(drawArmatureBones);

const showCurves = document.createElement('p');
showCurves.innerText = 'Show guides? ';
const drawGuidingCurves = document.createElement('input');
drawGuidingCurves.setAttribute('type', 'checkbox');
drawGuidingCurves.checked = true;
showCurves.appendChild(drawGuidingCurves);

const row = document.createElement('div');
row.setAttribute('style', 'display: flex;');

let tree: Model | null = null;
treeGen
    .generateSOSMC(
        {
            start: 'branch',
            sosmcDepth: 20,
            samples: (_: number) => 10,
            heuristicScale: (generation: number) => {
                return 0.01 - generation / 20 * 0.01;
            },
            costFn: guidingVectors,
            iterationHook: (instances: GeneratorInstance[]) => {
                generationInstances.push(instances);
            }
        },
        1 / 30
    )
    .then(() => {
        tree = generationInstances[0][0].getModel();

        const container = document.createElement('div');
        container.setAttribute('style', 'flex: 1; height: 600px; overflow-y: auto;');

        const buttons = document.createElement('div');

        generationInstances.forEach((instances: GeneratorInstance[], round: number) => {
            const group = document.createElement('p');
            group.innerText = `Round ${round + 1}`;

            instances.forEach((instance: GeneratorInstance, index: number) => {
                // Add more than just bones
                instance.finishGeneration();

                // Make a button to toggle its visibility
                const button = document.createElement('button');
                button.innerText = `${index + 1}`;
                button.addEventListener('click', () => (tree = instance.getModel()));
                group.appendChild(button);
            });
            buttons.appendChild(group);
        });

        container.appendChild(showBones);
        container.appendChild(showCurves);
        container.appendChild(buttons);
        row.appendChild(container);
    });

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 3: set up renderer
///////////////////////////////////////////////////////////////////////////////////////////////////

row.appendChild(renderer.stage);
document.body.appendChild(row);

renderer.camera.lookAt({ x: 0, y: 1, z: 0 });
renderer.camera.moveToWithFixedTarget({
    x: 0,
    y: 1,
    z: 6
});

// Draw the armature
const draw = () => {
    return {
        objects: tree === null ? [] : [tree],
        debugParams: {
            drawAxes: false,
            drawArmatureBones: !!drawArmatureBones.checked,
            drawGuidingCurve: drawGuidingCurves.checked ? guidingCurves : undefined
        }
    };
};

// Apply the constraints each frame.
renderer.eachFrame(draw);
