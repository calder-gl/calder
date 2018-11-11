import {
    Armature,
    CostFunction,
    Generator,
    GuidingVectors,
    Light,
    Material,
    Model,
    Node,
    Point,
    Renderer,
    RGBColor,
    Shape
} from '../calder';

import { range } from 'lodash';

// tslint:disable-next-line:import-name
import Bezier = require('bezier-js');

// Create the renderer
const renderer: Renderer = new Renderer({
    width: 800,
    height: 600,
    maxLights: 2,
    ambientLightColor: RGBColor.fromRGB(90, 90, 90),
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
    .define('forest', (_: Point) => {
        range(15).forEach(() => {
            const node = bone();
            node
                // Move to random spot in [-8, 8] x [-8, 8] on the ground
                .moveTo({ x: Math.random() * 16 - 8, y: 0, z: Math.random() * 16 - 8 });

            Generator.addDetail({ component: 'branch', at: node.point('base') });
        });
    })
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
    .wrapUpMany(['branch', 'maybeBranch', 'branchOrLeaf'], Generator.replaceWith('leaf'))
    .thenComplete(['leaf']);

const curves = [
    {
        bezier: new Bezier([
            { x: 2, y: -1, z: 0 },
            { x: 2.5, y: 0, z: 0 },
            { x: 5, y: 2.9, z: 0 },
            { x: 6, y: 3, z: 0 }
        ]),
        distanceMultiplier: GuidingVectors.NONE,
        alignmentMultiplier: 100,
        alignmentOffset: 0.85
    }
];
const guidingVectors = CostFunction.guidingVectors(curves);

const guidingCurve = guidingVectors
    .generateGuidingCurve()
    .map((path: [number, number, number][], index: number) => {
        return {
            path,
            selected: false,
            bezier: curves[index].bezier
        };
    });
const vectorField = guidingVectors.generateVectorField(8, 2);

let tree: Model | null = null;
treeGen
    .generateSOSMC({
        start: 'forest',
        sosmcDepth: 200,
        samples: 500,
        heuristicScale: 0.02,
        costFn: guidingVectors
    })
    .then((model: Model) => (tree = model));

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 3: set up renderer
///////////////////////////////////////////////////////////////////////////////////////////////////

document.body.appendChild(renderer.stage);

renderer.camera.lookAt({ x: 0, y: 1, z: 0 });

// Draw the armature
let angle = -Math.PI / 2;
const draw = () => {
    angle += 0.001;
    renderer.camera.moveToWithFixedTarget({
        x: Math.cos(angle) * 20,
        y: 1,
        z: -Math.sin(angle) * 20
    });

    return {
        objects: tree === null ? [] : [tree],
        debugParams: {
            drawAxes: true,
            drawArmatureBones: false,
            drawGuidingCurve: guidingCurve,
            drawVectorField: vectorField
        }
    };
};

// Apply the constraints each frame.
renderer.eachFrame(draw);
