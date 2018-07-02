import { Light, Renderer, RGBColor } from '../../src/calder';

describe('Renderer', () => {
    const maxLights: number = 3;
    const light: Light = Light.create({
        position: { x: 1, y: 1, z: 1 },
        color: RGBColor.fromHex('#000000'),
        strength: 3
    });

    xdescribe('addLight', () => {
        it('can append a new light to the `lights` array', () => {
            const renderer: Renderer = new Renderer({
                width: 800,
                height: 600,
                maxLights: maxLights,
                ambientLightColor: RGBColor.fromHex('#000000'),
                backgroundColor: RGBColor.fromHex('#000000')
            });
            expect(renderer.getLights().length).toEqual(0);
            renderer.addLight(light);
            expect(renderer.getLights().length).toEqual(1);
        });
    });

    xdescribe('removeLight', () => {
        it('can remove an existing light from the `lights` array', () => {
            const renderer: Renderer = new Renderer({
                width: 800,
                height: 600,
                maxLights: maxLights,
                ambientLightColor: RGBColor.fromHex('#000000'),
                backgroundColor: RGBColor.fromHex('#000000')
            });
            renderer.addLight(light);
            expect(renderer.getLights().length).toEqual(1);
            renderer.removeLight(light);
            expect(renderer.getLights().length).toEqual(0);
        });
    });
});
