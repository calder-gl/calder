import { Generator } from './Generator';
import { Node } from './Node';

export namespace Armature {
    /**
     * Exposes a way to define a prototype for an armature node so that you can then create
     * multiple instances of a node with the same defined control points.
     *
     * @param {(root: Node) => void} createPrototype A function to take in a node and set
     * whatever control points you need on it.
     *
     * @returns {() => Node} A function to generate a node with the specified prototype.
     */
    export function define(createPrototype: (root: Node) => void): () => Node {
        return () => {
            const root = new Node();
            createPrototype(root);

            return root;
        };
    }

    /**
     * Creates a new, empty generator.
     *
     * @returns {Generator} The new generator.
     */
    export function generator(): Generator {
        return new Generator();
    }
}
