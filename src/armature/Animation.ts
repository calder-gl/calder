import { Node } from './Node';
import { Transformation } from './Transformation';

import { remove } from 'lodash';

/**
 * Parameters that an end user passes in to define a keyframed animation.
 */
export type AnimationDescriptionParams = {
    /**
     * The node being animated.
     */
    node: Node;

    /**
     * A function to transform a node into a target transformation.
     */
    to: (node: Node) => void;

    /**
     * A starting time, in milliseconds since the epoch. Defaults to now if not specified.
     */
    start?: number;

    /**
     * The length of one cycle of the animation, in milliseconds.
     */
    duration: number;

    /**
     * How many times to repeat the animation, or 0 for infinite. Defaults to 1 time.
     */
    times?: number;

    /**
     * How much time to wait in between repeats, in milliseconds. Defaults to 0.
     */
    repeatDelay?: number;
};

/**
 * An internal representation of the state of an animation.
 */
type AnimationDescription = {
    /**
     * The node being animated.
     */
    node: Node;

    /**
     * A function to transform a node into a target transformation.
     */
    to: (node: Node) => void;

    /**
     * The target transformation for the current animation cycle, or null if a cycle hasn't yet
     * started.
     */
    finalTransform: Transformation | null;

    /**
     * The time to start the animation at, in seconds since the epoch.
     */
    start: number;

    /**
     * The duration of one cycle of the animation, in milliseconds.
     */
    duration: number;

    /**
     * How many times to repeat the animation, or 0 for infinite repeats.
     */
    times: number;

    /**
     * How much time, in milliseconds, to wait between repeats of the animation.
     */
    repeatDelay: number;

    /**
     * How many milliseconds into an animation cycle we were at in the last tick.
     */
    lastTimeInCycle: number;

    /**
     * The animation cycle we were in in the last tick.
     */
    lastCycle: number;
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
                const finalNode = animation.node.clone();
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
                // Infinite loops are never done
                return false;
            } else if (animation.times === 1) {
                const timeSoFar = currentTime - animation.start;
                const period = animation.duration;

                return timeSoFar / period >= 1;
            } else {
                const timeSoFar = currentTime - animation.start;
                const period = animation.duration + animation.repeatDelay;

                return timeSoFar / period >= animation.times;
            }
        });
    }
}
