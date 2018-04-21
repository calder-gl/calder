import { boi } from '../src/main';

describe('main module', () => {
    it('returns "BOI"', () => {
        expect(boi()).toBe('BOI');
    });
});
