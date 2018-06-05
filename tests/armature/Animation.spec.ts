import { vec3 } from 'gl-matrix';
import { Animation } from '../../src/armature/Animation';
import { Armature } from '../../src/armature/Armature';
import { Node } from '../../src/armature/Node';
import { Transformation } from '../../src/armature/Transformation';

const bone = Armature.define((root: Node) => {
    root.createPoint('base', vec3.fromValues(0, 0, 0));
    root.createPoint('tip', vec3.fromValues(0, 1, 0));
});

describe('Animation', () => {
    const realNow = Animation.now;
    const realInterpolate = Transformation.prototype.interpolate;

    const mockNow = (date: number) => {
        Animation.now = () => date;
    };

    beforeEach(() => Animation.resetAll());
    afterEach(() => (Animation.now = realNow));
    afterEach(() => (Transformation.prototype.interpolate = realInterpolate));

    describe('tick', () => {
        it('only applies animations when they are active', () => {
            const node = bone();
            const animationApplied = jest.fn();

            mockNow(1000);

            Animation.create({
                node,
                to: (_: Node) => animationApplied(),
                start: 2000,
                duration: 1000
            });

            Animation.tick();

            // Animation shouldn't be applied yet, it hasn't started
            expect(animationApplied.mock.calls.length).toBe(0);

            mockNow(2000);
            Animation.tick();

            // Animation should have been applied, since it has now started
            expect(animationApplied.mock.calls.length).toBe(1);

            mockNow(5000);
            Animation.tick();

            // No new applications should have been made, since the animation has ended
            expect(animationApplied.mock.calls.length).toBe(1);
        });

        it('runs animations the specified amount of times', () => {
            const node = bone();
            const animationApplied = jest.fn();

            mockNow(1000);

            Animation.create({
                node,
                to: (_: Node) => animationApplied(),
                start: 2000,
                duration: 1000,
                times: 2,
                repeatDelay: 1000
            });

            Animation.tick();

            // Animation shouldn't be applied yet, it hasn't started
            expect(animationApplied.mock.calls.length).toBe(0);

            mockNow(2000);
            Animation.tick();

            // Animation should have been applied, since it has now started
            expect(animationApplied.mock.calls.length).toBe(1);

            mockNow(3000);
            Animation.tick();

            // No new applications should have been made, since the animation is waiting
            // for the next iteration
            expect(animationApplied.mock.calls.length).toBe(1);

            mockNow(4000);
            Animation.tick();

            // The second iteration of the animation has started by now, should be applied again
            expect(animationApplied.mock.calls.length).toBe(2);

            mockNow(5000);
            Animation.tick();

            // No new applications should have been made, since the animation has ended
            expect(animationApplied.mock.calls.length).toBe(2);
        });

        it('accurately calculates how many subdivisions are left when interpolating', () => {
            const node = bone();
            const interpolate = jest.fn(() => new Transformation());
            Transformation.prototype.interpolate = interpolate;

            mockNow(1000);

            Animation.create({
                node,
                to: (_: Node) => {},
                start: 2000,
                duration: 1000
            });

            mockNow(2000);
            Animation.tick();

            // Animation should have been applied, asking for the first subdivision
            expect(interpolate.mock.calls.length).toBe(1);
            expect(interpolate.mock.calls[0][1]).toBe(0);

            mockNow(2500);
            Animation.tick();

            // Animation should have been applied again. Since we are halfway between the last
            // tick and the end of the animation, we should interpolate halfway.
            expect(interpolate.mock.calls.length).toBe(2);
            expect(interpolate.mock.calls[1][1]).toBe(0.5);

            mockNow(2875);
            Animation.tick();

            // Animation should have been applied again. Since we moved 75% from the last tick
            // to the end of the animation, we should interpolate by 0.75.
            expect(interpolate.mock.calls.length).toBe(3);
            expect(interpolate.mock.calls[2][1]).toBe(0.75);

            mockNow(3000);
            Animation.tick();

            // Animation should have been applied again. Since we moved all the way to the end
            // of the animation, we should interpolate by 1.
            expect(interpolate.mock.calls.length).toBe(4);
            expect(interpolate.mock.calls[3][1]).toBe(1);
        });
    });
});
