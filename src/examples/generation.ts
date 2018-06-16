import {
    Armature,
    Light,
    Matrix,
    Node,
    Point,
    Quaternion,
    Renderer,
    RGBColor,
    Shape
} from '../calder';

// Create the renderer
const renderer: Renderer = new Renderer({
    width: 800,
    height: 600,
    maxLights: 2,
    ambientLightColor: RGBColor.fromRGB(51, 51, 51)
});

// Create light sources for the renderer
const light1: Light = new Light({
    position: { x: 10, y: 10, z: 10 },
    color: RGBColor.fromHex('#FFFFFF'),
    intensity: 256
});
const light2: Light = new Light({
    position: { x: 700, y: 500, z: 50 },
    color: RGBColor.fromHex('#FFFFFF'),
    intensity: 100
});

// Add lights to the renderer
renderer.addLight(light1);
renderer.addLight(light2);

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 1: create geometry
///////////////////////////////////////////////////////////////////////////////////////////////////

// Setup leaf
const leafColor = RGBColor.fromRGB(204, 255, 204);
const workingLeafSphere = Shape.sphere(leafColor);
const leafSphere = workingLeafSphere.bake();

// Setup branch
const branchColor = RGBColor.fromRGB(102, 76.5, 76.5);
const workingBranchShape = Shape.cylinder(branchColor);
const branchShape = workingBranchShape.bake();

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 2: create armature
///////////////////////////////////////////////////////////////////////////////////////////////////

const bone = Armature.define((root: Node) => {
    root.createPoint('base', { x: 0, y: 0, z: 0 });
    root.createPoint('mid', { x: 0, y: 0.5, z: 0 });
    root.createPoint('tip', { x: 0, y: 1, z: 0 });
});

const treeGen = Armature.generator();
const tree = treeGen
    .define('branch', 1, (root: Point) => {
        const node = bone();
        node.point('base').stickTo(root);
        const theta = Math.random() * 45;
        const phi = Math.random() * 360;
        node.setRotation(Matrix.fromQuat4(Quaternion.fromEuler(theta, phi, 0)));
        node.setScale(Matrix.fromScaling({ x: 0.8, y: 0.8, z: 0.8 })); // Shrink a bit

        const trunk = node.point('mid').attach(branchShape);
        trunk.setScale(Matrix.fromScaling({ x: 0.2, y: 1, z: 0.2 }));

        // branching factor of 2
        treeGen.addDetail({ component: 'branchOrLeaf', at: node.point('tip') });
        treeGen.addDetail({ component: 'branchOrLeaf', at: node.point('tip') });
    })
    .define('branchOrLeaf', 1, (root: Point) => {
        treeGen.addDetail({ component: 'leaf', at: root });
    })
    .define('branchOrLeaf', 4, (root: Point) => {
        treeGen.addDetail({ component: 'branch', at: root });
    })
    .define('leaf', 1, (root: Point) => {
        const leaf = root.attach(leafSphere);
        const scale = Math.random() * 0.5 + 0.5;
        leaf.setScale(Matrix.fromScaling({ x: scale, y: scale, z: scale }));
    })
    .generate({ start: 'branch', depth: 15 });

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 3: set up renderer
///////////////////////////////////////////////////////////////////////////////////////////////////

document.body.appendChild(renderer.stage);

renderer.camera.moveTo({ x: 0, y: 0, z: 8 });
renderer.camera.lookAt({ x: 2, y: 2, z: -4 });

// Draw the armature
let angle = 0;
const draw = () => {
    angle += 0.5;
    tree.setRotation(Matrix.fromQuat4(Quaternion.fromEuler(0, angle, 0)));

    return {
        objects: [tree],
        debugParams: { drawAxes: true, drawArmatureBones: false }
    };
};

// Apply the constraints each frame.
renderer.eachFrame(draw);
