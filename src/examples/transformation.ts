import {
    Renderer,
    RGBColor,
    Light,
    Shape,
    Armature,
    Model,
    Node,
    Material,
    WorkingGeometry
} from '../calder';

// Render and Light creation
const renderer: Renderer = new Renderer({
    width: 800,
    height: 600,
    maxLights: 2,
    ambientLightColor: RGBColor.fromRGB(0, 25, 25),
    backgroundColor: RGBColor.fromHex('#FFDDFF')
});

const light: Light = Light.create({
    position: { x: 10, y: 10, z: 10 },
    color: RGBColor.fromHex('#FFFFFF'),
    strength: 200
})

renderer.addLight(light);

// Geometry
const green: RGBColor = RGBColor.fromRGB(204, 255, 204);
const sphere: WorkingGeometry = Shape.sphere(Material.create({ color: green, shininess: 100 }));

// Armature
const bone = Armature.define((root: Node) => {
    root.createPoint('base', { x: 0, y: 0, z: 0});
    root.createPoint('tip', { x: 0, y: 1, z: 0 });
});

const tower: Model = Model.create(bone());
const top: Node = tower.root();

const nextPiece: Node = tower.add(bone());
nextPiece.point('base').stickTo(top.point('tip'));
tower.add(nextPiece.point('base').attach(sphere));

// Set up Renderer
document.body.appendChild(renderer.stage);

renderer.camera.moveTo({ x: 0, y: 0, z: 8 });
renderer.camera.lookAt({ x: 2, y: 2, z: -4 });

const draw = () => {
    return {
        objects: [tower],
        debugParams: { drawAxes: true, drawArmatureBones: true }
    }
}

renderer.eachFrame(draw);
