import { Armature } from '../../src/armature/Armature';
import { GeneratorInstance } from '../../src/armature/Generator';
import { Node, Point } from '../../src/armature/Node';

const bone = Armature.define((root: Node) => {
    root.createPoint('base', { x: 0, y: 0, z: 0 });
    root.createPoint('tip', { x: 0, y: 1, z: 0 });
});

describe('Generator', () => {
    it('generates to the required depth', () => {
        const towerGen = Armature.generator();
        const tower = towerGen
            .define('block', (root: Point, instance: GeneratorInstance) => {
                const node = bone();
                node.point('base').stickTo(root);

                instance.addDetail({ component: 'block', at: node.point('tip') });
            })
            .generate({ start: 'block', depth: 5 });

        let depth = 0;
        let block = tower;
        while (block.children.length > 0) {
            depth += 1;
            block = block.children[0];
        }

        expect(depth).toBe(5);
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

        let depth = 0;
        let block = tower;
        while (block.children.length > 0) {
            depth += 1;
            block = block.children[0];
        }

        expect(depth).toBe(1);
    });
});
