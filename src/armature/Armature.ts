import { Node } from './Node';

export namespace Armature {
    export function define(createPrototype: (root: Node) => void): () => Node {
        return () => {
            const root = new Node();
            createPrototype(root);

            return root;
        };
    }
}
