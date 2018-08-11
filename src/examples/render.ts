import {
    identityMatrix4,
    Animation,
    Armature,
    Constraints,
    CMYKColor,
    Light,
    Material,
    Matrix,
    Model,
    Node,
    Quaternion,
    Renderer,
    RGBColor,
    Shape,
    WorkingGeometry
} from '../calder';

// Create the renderer
const renderer: Renderer = new Renderer({
    width: 800,
    height: 600,
    maxLights: 2,
    ambientLightColor: RGBColor.fromRGB(0, 25, 25),
    backgroundColor: RGBColor.fromHex('#0066FF')
});

// Create light sources for the renderer
const light1: Light = Light.create({
    position: { x: 10, y: 10, z: 10 },
    color: RGBColor.fromHex('#FFFFFF'),
    strength: 300
});
const light2: Light = Light.create({
    position: { x: 700, y: 500, z: 50 },
    color: RGBColor.fromHex('#FFFFFF'),
    strength: 200
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
const sphere: WorkingGeometry = Shape.sphere(Material.create({ color: purple, shininess: 256 }));

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 2: create armature
///////////////////////////////////////////////////////////////////////////////////////////////////

const bone = Armature.define((root: Node) => {
    root.createPoint('base', { x: 0, y: 0, z: 0 });
    root.createPoint('tip', { x: 0, y: 1, z: 0 });
});

const tower = Model.create(bone());

let top = tower.root();

for (let i = 0; i < 5; i += 1) {
    const nextPiece = tower.add(bone());
    nextPiece.point('base').stickTo(top.point('tip'));
    tower.add(nextPiece.point('base').attach(sphere));
    nextPiece.setRotation(Matrix.fromQuat4(Quaternion.fromEuler()));
    top = nextPiece;
}

const test = Model.create(bone());
test.root().setPosition({ x: 3, y: 0, z: 0 });

test.root().setScale(Matrix.fromScaling({ x: 1, y: 3, z: 1 }));
const testChild = test.add(bone());
testChild.point('base').stickTo(test.root().point('tip'));

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 3: set up renderer
///////////////////////////////////////////////////////////////////////////////////////////////////

document.body.appendChild(renderer.stage);

renderer.camera.moveTo({ x: 0, y: 0, z: 8 });
renderer.camera.lookAt({ x: 2, y: 2, z: -4 });

// Draw the armature

// Create a new constraint to be applied to the `test` Node.
const constraints = Constraints.getInstance();
constraints.add(test.root(), (node: Node) => {
    node
        .hold(node.point('base'))
        .grab(node.point('tip'))
        .stretchTo(tower.root().point('tip'))
        .release();
});

Animation.create({
    node: tower.root(),
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
