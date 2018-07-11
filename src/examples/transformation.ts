import {
    Renderer,
    RGBColor,
    Light
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

// TODO: add armature and geometry here

// Set up Renderer
document.body.appendChild(renderer.stage);

renderer.camera.moveTo({ x: 0, y: 0, z: 8 });
renderer.camera.lookAt({ x: 2, y: 2, z: -4 });

const draw = () => {
    return {
        objects: [],
        debugParams: { drawAxes: true, drawArmatureBones: true }
    }
}

renderer.eachFrame(draw);
