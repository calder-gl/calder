import { Light } from '../../src/renderer/interfaces/Light';
import { Renderer } from '../../src/renderer/Renderer';

describe('Renderer', () => {
    const maxLights: number = 3;
    const light: Light = {
        lightPosition: [1, 1, 1],
        lightColor: [0, 0, 0],
        lightIntensity: 256
    }

    describe('addLight', () => {
        it('can append a new light to the `lights` array', () => {
            const renderer: Renderer = new Renderer(800, 600, maxLights);
            expect(renderer.getLights().length).toEqual(0);
            renderer.addLight(light);
            expect(renderer.getLights().length).toEqual(1);

        });
    });

    describe('removeLight', () => {
        it('can remove an existing light from the `lights` array', () => {
            const renderer: Renderer = new Renderer(800, 600, maxLights);
            renderer.addLight(light);
            expect(renderer.getLights().length).toEqual(1);
            renderer.removeLight(light);
            expect(renderer.getLights().length).toEqual(0);
        });
    });
});
