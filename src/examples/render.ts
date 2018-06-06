import { Armature } from '../armature/Armature';
import { Node } from '../armature/Node';
import { genSphere } from '../geometry/Sphere';
import { Light } from '../renderer/interfaces/Light';
import { Renderer } from '../renderer/Renderer';

import { mat4, quat, vec3 } from 'gl-matrix';
import { flatMap, range } from 'lodash';
import { Constraints } from '../armature/Constraints';

const light1: Light = { lightPosition: [10, 10, 10], lightColor: [1, 1, 1], lightIntensity: 256 };
const light2: Light = { lightPosition: [700, 500, 50], lightColor: [3, 3, 3], lightIntensity: 100 };

const renderer: Renderer = new Renderer(800, 600, 2, vec3.fromValues(0.0, 0.1, 0.0));

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 1: create geometry
///////////////////////////////////////////////////////////////////////////////////////////////////

// Add lights to the renderer
renderer.addLight(light1);
renderer.addLight(light2);

const sphere = genSphere();
sphere.colors = Int16Array.from(flatMap(range(sphere.vertices.length / 3), () => [1, 0, 0]));

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 2: create armature
///////////////////////////////////////////////////////////////////////////////////////////////////

const bone = Armature.define((root: Node) => {
    root.createPoint('base', vec3.fromValues(0, 0, 0));
    root.createPoint('tip', vec3.fromValues(0, 1, 0));
});

const tower = bone();

let top = tower;
range(5).forEach(() => {
    const nextPiece = bone();
    nextPiece.point('base').stickTo(top.point('tip'));
    nextPiece.point('base').attach(sphere);
    nextPiece.setRotation(
        mat4.fromQuat(
            mat4.create(),
            quat.fromEuler(quat.create(), Math.random() * 90 - 45, Math.random() * 90 - 45, 0)
        )
    );

    top = nextPiece;
});

const test = bone();
test.setPosition(vec3.fromValues(3, 0, 0));
test.setScale(mat4.fromScaling(mat4.create(), vec3.fromValues(1, 3, 1)));
const testChild = bone();
testChild.point('base').stickTo(test.point('tip'));

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 3: set up renderer
///////////////////////////////////////////////////////////////////////////////////////////////////

document.body.appendChild(renderer.stage);

renderer.camera.moveTo(vec3.fromValues(0, 0, 8));
renderer.camera.lookAt(vec3.fromValues(2, 2, -4));

// Draw the armature
let rotation = 90;
const angle = Math.random() * 90;

// Create a new constraint to be applied to the `test` Node.
const constraints = Constraints.getInstance();
constraints.add(test, (node: Node) => {
    node
        .hold(node.point('base'))
        .grab(node.point('tip'))
        .stretchTo(tower.point('tip'))
        .release();
});

const draw = () => {
    rotation += 1;
    tower.setRotation(
        mat4.fromQuat(mat4.create(), quat.fromEuler(quat.create(), angle, rotation, 0))
    );

    return {
        objects: [tower, test],
        debugParams: { drawAxes: true, drawArmatureBones: true }
    };
};

// Apply the constraints each frame.
renderer.eachFrame(draw);
