import { Armature } from '../../src/armature/Armature';
import { Node, Point } from '../../src/armature/Node';

import { vec3 } from 'gl-matrix';

const bone = Armature.define((root: Node) => {
    root.createPoint('base', vec3.fromValues(0, 0, 0));
    root.createPoint('tip', vec3.fromValues(0, 1, 0));
});

describe('Generator', () => {
    it('generates to the required depth', () => {
        const towerGen = Armature.generator();
        const tower = towerGen
            .define('block', 1, (root: Point) => {
                const node = bone();
                node.point('base').stickTo(root);

                towerGen.addDetail({ component: 'block', at: node.point('tip') });
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
            .define('block', 1, (root: Point) => {
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
