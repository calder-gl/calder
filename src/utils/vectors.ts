import { emptyCost, Generator, GeneratorInstance } from '../armature/Generator';
import { Node } from '../armature/Node';

import { vec4 } from 'gl-matrix';
import { range } from 'lodash';

const vectorPool: vec4[] = [];
let nextVectorIndex: number = 0;

export const zeroVec4 = vec4.fromValues(0, 0, 0, 1);

// Convenience functions to reuse a pool of vectors
const getNewVector = () => {
    if (nextVectorIndex < vectorPool.length) {
        const nextVector = vectorPool[nextVectorIndex];
        nextVectorIndex += 1;

        return nextVector;
    } else {
        const nextVector = vec4.create();
        vectorPool.push(nextVector);
        nextVectorIndex += 1;

        return nextVector;
    }
};

const done = () => {
    nextVectorIndex = 0;
};

/**
 * Given a generator and a component to generate, creates a set of direction vectors generated as
 * children of that component.
 *
 * Importantly, this reuses vectors in each call, so it assumes the vectors have been read and
 * processed and can be reused by the time this function is called again.
 *
 * TODO(https://github.com/calder-gl/calder/issues/151): Move this to a better location
 *
 * @returns {vec4[]} A set of generated, scaled vectors.
 */
export function worldSpaceVectors(generator: Generator, start: string): vec4[] {
    const nodeLocations: Map<Node, vec4> = new Map<Node, vec4>();
    const vectors: vec4[] = [];

    const instance = new GeneratorInstance(generator, { getCost: () => emptyCost });
    instance.generate({ start, depth: 0 });

    // Grow ten times, since any more than that starts to have low probabilities and lower weight
    range(10).forEach(() => {
        instance.growIfPossible((added: Node[]) => {
            // Just get the added structure
            const addedStructure: Node[] = [];
            added.forEach((n: Node) =>
                n.structureCallback((node: Node) => {
                    addedStructure.push(node);
                })
            );

            addedStructure.forEach((node: Node) => {
                const localToGlobalTransform = node.localToGlobalTransform();

                // Get the location for the current node
                const globalPosition = vec4.transformMat4(
                    getNewVector(),
                    zeroVec4,
                    localToGlobalTransform
                );
                nodeLocations.set(node, globalPosition);

                // If the node has a parent that isn't yet in the cache, add it
                if (node.parent !== null && !nodeLocations.has(node.parent)) {
                    const parentLocalToGlobalTransform = node.parent.localToGlobalTransform();
                    const parentGlobalPosition = vec4.transformMat4(
                        getNewVector(),
                        zeroVec4,
                        parentLocalToGlobalTransform
                    );
                    nodeLocations.set(node.parent, parentGlobalPosition);
                }

                const parentPosition =
                    node.parent === null
                        ? zeroVec4
                        : <vec4>nodeLocations.get(node.parent);

                // Get the vector between the parent position and the current position
                const vector = vec4.sub(getNewVector(), globalPosition, parentPosition);

                vectors.push(vector);
            });
        });
    });

    // Reuse the pool of vectors for the next call
    done();

    return vectors;
}
