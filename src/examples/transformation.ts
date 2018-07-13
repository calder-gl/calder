import {
    Renderer,
    RGBColor,
    Light,
    Shape,
    Armature,
    Model,
    Node,
    Material,
    WorkingGeometry,
    Matrix,
    Quaternion
} from '../calder';
import { vec3 } from 'gl-matrix';

// Render and Light creation
const renderer: Renderer = new Renderer({
    width: 800,
    height: 600,
    maxLights: 2,
    ambientLightColor: RGBColor.fromRGB(90, 90, 90),
    backgroundColor: RGBColor.fromHex('#ffb956')
});

const light: Light = Light.create({
    position: { x: 10, y: 10, z: 10 },
    color: RGBColor.fromHex('#FFFFFF'),
    strength: 200
})

renderer.addLight(light);

// Geometry
const green: RGBColor = RGBColor.fromRGB(204, 255, 204);
const body: WorkingGeometry = Shape.sphere(Material.create({ color: green, shininess: 100 }));
body.proportionalStretchByFactor(0.8);
body.freeformStretchByFactor(1.5, vec3.fromValues(0, -1, 0));

const head: WorkingGeometry = Shape.sphere(Material.create({ color: green, shininess: 100 }));
head.proportionalStretchByFactor(0.8);

// Armature
const bone = Armature.define((root: Node) => {
    root.createPoint('head', { x: 0, y: 0.5, z: 0});
    root.createPoint('body', { x: 0, y: -1, z: 0 });
});

const bust: Model = Model.create(bone());
const top: Node = bust.root();
bust.add(top.point('head').attach(head));
bust.add(top.point('body').attach(body));

// Set up Renderer
document.body.appendChild(renderer.stage);

renderer.camera.moveTo({ x: 0, y: 0, z: 8 });
renderer.camera.lookAt({ x: 2, y: 2, z: -4 });

let angle = 0;
const draw = () => {
    angle += 0.5;
    bust.root().setRotation(Matrix.fromQuat4(Quaternion.fromEuler(0, angle, 0)));

    return {
        objects: [bust],
        debugParams: { drawAxes: true, drawArmatureBones: true }
    }
}

renderer.eachFrame(draw);
