import {
    identityMatrix4,
    Animation,
    Armature,
    BakedGeometry,
    Constraints,
    CMYKColor,
    Light,
    Matrix,
    Node,
    Quaternion,
    Renderer,
    RGBColor,
    Shape,
    WorkingGeometry
} from '../calder';

// Create the renderer
const renderer: Renderer = new Renderer(800, 600, 2, { x: 0.0, y: 0.1, z: 0.0 });

// Create light sources for the renderer
const light1: Light = new Light({
    position: { x: 10, y: 10, z: 10 },
    color: RGBColor.fromHex("#FFFFFF"),
    intensity: 256
});
const light2: Light = new Light({
    position: { x: 700, y: 500, z: 50 },
    color: RGBColor.fromHex("#FFFFFF"),
    intensity: 100
});

// Add lights to the renderer
renderer.addLight(light1);
renderer.addLight(light2);

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 1: create geometry
///////////////////////////////////////////////////////////////////////////////////////////////////

// Setup colors
const blue: RGBColor = RGBColor.fromHex('0000FF');
const red: CMYKColor = CMYKColor.fromCMYK(0, 1, 1, 0);
const purple: CMYKColor = red.mix(blue);

// Setup sphere
const workingSphere: WorkingGeometry = Shape.sphere(purple);
const sphere: BakedGeometry = workingSphere.bake();

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 2: create armature
///////////////////////////////////////////////////////////////////////////////////////////////////

const bone = Armature.define((root: Node) => {
    root.createPoint('base', { x: 0, y: 0, z: 0 });
    root.createPoint('tip', { x: 0, y: 1, z: 0 });
});

const tower = bone();

let top = tower;

for (let i = 0; i < 5; i += 1) {
    const nextPiece = bone();
    nextPiece.point('base').stickTo(top.point('tip'));
    nextPiece.point('base').attach(sphere);
    nextPiece.setRotation(Matrix.fromQuat4(Quaternion.fromEuler()));
    top = nextPiece;
}

const test = bone();
test.setPosition({ x: 3, y: 0, z: 0 });

test.setScale(Matrix.fromScaling({ x: 1, y: 3, z: 1 }));
const testChild = bone();
testChild.point('base').stickTo(test.point('tip'));

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 3: set up renderer
///////////////////////////////////////////////////////////////////////////////////////////////////

document.body.appendChild(renderer.stage);

renderer.camera.moveTo({ x: 0, y: 0, z: 8 });
renderer.camera.lookAt({ x: 2, y: 2, z: -4 });

// Draw the armature

// Create a new constraint to be applied to the `test` Node.
const constraints = Constraints.getInstance();
constraints.add(test, (node: Node) => {
    node
        .hold(node.point('base'))
        .grab(node.point('tip'))
        .stretchTo(tower.point('tip'))
        .release();
});

Animation.create({
    node: tower,
    to: (node: Node) => {
        const theta = Math.random() * 90;
        const phi = Math.random() * 360;
        node.setRotation(Matrix.fromQuat4(Quaternion.fromEuler(theta, phi, 0)));
        node.setScale(identityMatrix4);
    },
    duration: 1000,
    times: 0,
    repeatDelay: 0
});

const draw = () => {
    return {
        objects: [tower, test],
        debugParams: { drawAxes: true, drawArmatureBones: true }
    };
};

// Apply the constraints each frame.
renderer.eachFrame(draw);
