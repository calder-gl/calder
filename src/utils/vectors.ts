import { emptyCost, Generator, GeneratorInstance } from '../armature/Generator';
import { Node } from '../armature/Node';

import { vec4 } from 'gl-matrix';
import { range } from 'lodash';

const vectorPool: vec4[] = [];
let nextVectorIndex: number = 0;
const zero = vec4.fromValues(0, 0, 0, 1);

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

export function worldSpaceVectors(generator: Generator, start: string): vec4[] {
    const nodeLocations: Map<Node, vec4> = new Map<Node, vec4>();
    const nodeProbabilities: Map<Node, number> = new Map<Node, number>();
    const vectors: vec4[] = [];

    const instance = new GeneratorInstance(generator, { getCost: () => emptyCost });
    instance.generate({ start, depth: 0 });

    range(10).forEach(() => {
        const numChoices = instance.getSpawnPoints().length;

        instance.growIfPossible((added: Node[]) => {
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
                    zero,
                    localToGlobalTransform
                );
                nodeLocations.set(node, globalPosition);

                // If the node has a parent that isn't yet in the cache, add it
                if (node.parent !== null && !nodeLocations.has(node.parent)) {
                    const parentLocalToGlobalTransform = node.parent.localToGlobalTransform();
                    const parentGlobalPosition = vec4.transformMat4(
                        getNewVector(),
                        zero,
                        parentLocalToGlobalTransform
                    );
                    nodeLocations.set(node.parent, parentGlobalPosition);
                }

                const parentPosition =
                    node.parent === null
                        ? vec4.fromValues(0, 0, 0, 1)
                        : <vec4>nodeLocations.get(node.parent);

                // Get the vector between the parent position and the current position
                const vector = vec4.sub(getNewVector(), globalPosition, parentPosition);

                // Calculate the probability of this particular node
                const parentProbability = (node.parent && nodeProbabilities.get(node.parent)) || 1;
                const nodeProbability = parentProbability / numChoices;
                nodeProbabilities.set(node, nodeProbability);

                // Weight the vector by its probability
                vec4.scale(vector, vector, nodeProbability);

                vectors.push(vector);
            });
        });
    });

    done();

    return vectors;
}
