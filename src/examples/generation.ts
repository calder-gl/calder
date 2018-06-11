import { Armature } from '../armature/Armature';
import { Node, Point } from '../armature/Node';
import { genSphere } from '../geometry/Sphere';
import { Light } from '../renderer/interfaces/Light';
import { Renderer } from '../renderer/Renderer';

import { mat4, quat, vec3 } from 'gl-matrix';
import { flatMap } from 'lodash';

const light1: Light = {
    lightPosition: [10, 10, 10],
    lightColor: [0.3, 0.3, 0.3],
    lightIntensity: 256
};
const light2: Light = {
    lightPosition: [700, 500, 50],
    lightColor: [0.3, 0.3, 0.3],
    lightIntensity: 100
};

const renderer: Renderer = new Renderer(800, 600, 2, vec3.fromValues(0.2, 0.2, 0.2));

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 1: create geometry
///////////////////////////////////////////////////////////////////////////////////////////////////

// Add lights to the renderer
renderer.addLight(light1);
renderer.addLight(light2);

const leafSphere = genSphere();
leafSphere.colors = Float32Array.from(flatMap(leafSphere.vertices, () => [0.8, 1, 0.8]));

const branchSphere = genSphere();
branchSphere.colors = Float32Array.from(flatMap(branchSphere.vertices, () => [0.4, 0.3, 0.3]));

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 2: create armature
///////////////////////////////////////////////////////////////////////////////////////////////////

const bone = Armature.define((root: Node) => {
    root.createPoint('base', vec3.fromValues(0, 0, 0));
    root.createPoint('mid', vec3.fromValues(0, 0.5, 0));
    root.createPoint('tip', vec3.fromValues(0, 1, 0));
});

const treeGen = Armature.generator();
const tree = treeGen
    .define('branch', 1, (root: Point) => {
        const node = bone();
        node.point('base').stickTo(root);
        const theta = Math.random() * 70;
        const phi = Math.random() * 360;
        node.setRotation(
            mat4.fromQuat(mat4.create(), quat.fromEuler(quat.create(), theta, phi, 0))
        );
        node.setScale(mat4.fromScaling(mat4.create(), vec3.fromValues(0.8, 0.8, 0.8))); // Shrink a bit

        const trunk = node.point('mid').attach(branchSphere);
        trunk.setScale(mat4.fromScaling(mat4.create(), vec3.fromValues(0.2, 0.8, 0.2)));

        // branching factor of 2
        treeGen.addDetail({ component: 'branchOrLeaf', at: node.point('tip') });
        treeGen.addDetail({ component: 'branchOrLeaf', at: node.point('tip') });
    })
    .define('branchOrLeaf', 1, (root: Point) => {
        treeGen.addDetail({ component: 'leaf', at: root });
    })
    .define('branchOrLeaf', 3, (root: Point) => {
        treeGen.addDetail({ component: 'branch', at: root });
    })
    .define('leaf', 1, (root: Point) => {
        const leaf = root.attach(leafSphere);
        leaf.setScale(mat4.fromScaling(mat4.create(), vec3.fromValues(0.5, 0.5, 0.5)));
    })
    .generate({ start: 'branch', depth: 15 });

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 3: set up renderer
///////////////////////////////////////////////////////////////////////////////////////////////////

document.body.appendChild(renderer.stage);

renderer.camera.moveTo(vec3.fromValues(0, 0, 8));
renderer.camera.lookAt(vec3.fromValues(2, 2, -4));

// Draw the armature
let angle = 0;
const draw = () => {
    angle += 0.5;
    tree.setRotation(mat4.fromQuat(mat4.create(), quat.fromEuler(quat.create(), 0, angle, 0)));

    return {
        objects: [tree],
        debugParams: { drawAxes: true, drawArmatureBones: true }
    };
};

// Apply the constraints each frame.
renderer.eachFrame(draw);
