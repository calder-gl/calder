import { Armature } from '../../src/armature/Armature';
import { Generator } from '../../src/armature/Generator';
import { Node, Point } from '../../src/armature/Node';

const bone = Armature.define((root: Node) => {
    root.createPoint('base', { x: 0, y: 0, z: 0 });
    root.createPoint('tip', { x: 0, y: 1, z: 0 });
});

describe('Generator', () => {
    it('generates to the required depth', () => {
        const towerGen = Armature.generator();
        const tower = towerGen
            .define('block', (root: Point) => {
                const node = bone();
                node.point('base').stickTo(root);

                Generator.addDetail({ component: 'block', at: node.point('tip') });
            })
            .wrapUp('block', () => {})
            .generate({ start: 'block', depth: 5 });

        expect(tower.nodes.length).toBe(6); // Root plus five blocks
    });

    it('handles terminal nodes', () => {
        const towerGen = Armature.generator();
        const tower = towerGen
            .define('block', (root: Point) => {
                const node = bone();
                node.point('base').stickTo(root);

                // This definition does not add any more detail
            })
            .generate({ start: 'block', depth: 5 });

        expect(tower.nodes.length).toBe(2); // Root plus one block
    });
});
