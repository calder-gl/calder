import { Node } from './Node';
import { Transformation } from './Transformation';

import { remove } from 'lodash';

type AnimationDescription = {
    node: Node;
    to: (node: Node) => void;
    finalTransform: Transformation | null;
    curve: string;
    start: number;
    duration: number;
    times: number;
    repeatDelay: number;
    lastTimeInCycle: number;
    lastCycle: number;
};

type AnimationDescriptionParams = {
    node: Node;
    to: (node: Node) => void;
    curve?: string;
    start?: number;
    duration: number;
    times?: number;
    repeatDelay?: number;
};

export namespace Animation {
    const queue: AnimationDescription[] = [];
    const current: AnimationDescription[] = [];

    /**
     * Clears all current animations.
     */
    export function resetAll() {
        queue.length = 0;
        current.length = 0;
    }

    /**
     * @returns {number} The current time, in milliseconds since the epoch.
     */
    export function now(): number {
        return new Date().getTime();
    }

    /**
     * Creates and queues up an animation with the given parameters.
     *
     * @param {AnimationDescriptionParams} params The information about the new animation.
     */
    export function create(params: AnimationDescriptionParams) {
        const animation = {
            node: params.node,
            to: params.to,
            finalTransform: null,
            curve: params.curve !== undefined ? params.curve : 'linear',
            start: params.start !== undefined ? params.start : Animation.now(),
            duration: params.duration,
            times: params.times !== undefined ? params.times : 1,
            repeatDelay: params.repeatDelay !== undefined ? params.repeatDelay : 0,
            lastTimeInCycle: 0,
            lastCycle: -1
        };

        enqueue(animation);
    }

    /**
     * Updates the state of all animations according to the current time.
     */
    export function tick() {
        const currentTime = Animation.now();

        dequeueNewAnimations(currentTime);
        applyCurrentAnimations(currentTime);
        removeFinishedAnimations(currentTime);
    }

    /**
     * Adds an animation to the queue, ensuring that the queue is kept in order of start time.
     */
    function enqueue(animation: AnimationDescription) {
        // TODO: binary search instead of insert + sort
        queue.push(animation);
        queue.sort((a: AnimationDescription, b: AnimationDescription) => {
            if (a.start < b.start) {
                return -1;
            } else if (a.start > b.start) {
                return 1;
            } else {
                return 0;
            }
        });
    }

    /**
     * Moves all animations that should be running from the queue and puts them into `current`.
     */
    function dequeueNewAnimations(currentTime: number) {
        while (queue.length > 0 && queue[0].start <= currentTime) {
            current.push(queue[0]);
            queue.shift();
        }
    }

    /**
     * Updates the nodes for all currently active animations, interpolating between the given
     * animation states.
     */
    function applyCurrentAnimations(currentTime: number) {
        // TODO: use curves that aren't linear
        current.forEach((animation: AnimationDescription) => {
            const currentTransform = animation.node.getRawTransformation();
            const period = animation.duration + animation.repeatDelay;

            let currentCycle = Math.floor((currentTime - animation.start) / period);
            if (animation.times > 0) {
                currentCycle = Math.min(animation.times - 1, currentCycle);
            }

            const timeInCurrentCycle = currentTime - animation.start - currentCycle * period;
            const remainingTargetsExist = animation.times === 0 || currentCycle < animation.times;
            const inNewCycle = animation.lastCycle < currentCycle;

            // Recompute target state of animation if we have entered a new cycle
            if (animation.finalTransform === null || (inNewCycle && remainingTargetsExist)) {
                animation.lastTimeInCycle = 0;

                // Clone the current node and apply the callback to generate the target state
                const finalNode = Node.clone(animation.node);
                animation.to(finalNode);

                // Extract the transformation from the modified node
                animation.finalTransform = finalNode.getRawTransformation();
            }

            const timeRemainingInCycle = animation.duration - animation.lastTimeInCycle;
            let amount = (timeInCurrentCycle - animation.lastTimeInCycle) / timeRemainingInCycle;

            // If we are in the delay period between cycles, do nothing and exit early
            if (amount > 1 && remainingTargetsExist) {
                return;
            }

            amount = Math.max(0, amount);
            amount = Math.min(1, amount);

            const interpolated = currentTransform.interpolate(animation.finalTransform, amount);
            animation.node.setRawTransformation(interpolated);

            animation.lastTimeInCycle = timeInCurrentCycle;
            animation.lastCycle = currentCycle;
        });
    }

    /**
     * Remove animations that have entirely completed from `current`.
     */
    function removeFinishedAnimations(currentTime: number) {
        remove(current, (animation: AnimationDescription) => {
            if (animation.times === 0) {
                return false;
            }

            if (animation.times === 1) {
                return (currentTime - animation.start) / animation.duration >= 1;
            }

            return (
                (currentTime - animation.start) / (animation.duration + animation.repeatDelay) >=
                animation.times
            );
        });
    }
}
