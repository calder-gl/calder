import { Node } from './Node';
import { Transformation } from './Transformation';

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
    let current: AnimationDescription[] = [];

    export function now(): number {
        return new Date().getTime();
    }

    export function create(params: AnimationDescriptionParams) {
        const animation = {
            node: params.node,
            to: params.to,
            finalTransform: null,
            curve: params.curve !== undefined ? params.curve : 'linear',
            start: params.start !== undefined ? params.start : now(),
            duration: params.duration,
            times: params.times !== undefined ? params.times : 1,
            repeatDelay: params.repeatDelay !== undefined ? params.repeatDelay : 0,
            lastTimeInCycle: 0
        };

        enqueue(animation);
    }

    export function tick() {
        const currentTime = now();

        dequeueNewAnimations(currentTime);
        applyCurrentAnimations(currentTime);
        removeFinishedAnimations(currentTime);
    }

    function enqueue(animation: AnimationDescription) {
        // TODO: binary search instead of insert + sort
        queue.push(animation);
        queue.sort((a: AnimationDescription, b: AnimationDescription) => {
            if (a.start < b.start) {
                return -1;
            }
            if (a.start > b.start) {
                return 1;
            }

            return 0;
        });
    }

    function dequeueNewAnimations(currentTime: number) {
        while (queue.length > 0 && queue[0].start <= currentTime) {
            current.push(queue[0]);
            queue.shift();
        }
    }

    function applyCurrentAnimations(currentTime: number) {
        // TODO: use curves that aren't linear
        current.forEach((animation: AnimationDescription) => {
            const currentTransform = animation.node.getRawTransformation();
            const period = animation.duration + animation.repeatDelay;

            let currentCycle = Math.floor((currentTime - animation.start) / period);
            if (animation.times > 0) {
                currentCycle = Math.max(animation.times, currentCycle);
            }

            const timeInCurrentCycle = currentTime - animation.start - currentCycle * period;
            if (animation.finalTransform === null || animation.lastTimeInCycle > timeInCurrentCycle) {
                // We've looped into a new cycle
                animation.lastTimeInCycle = 0;
                const finalNode = Node.clone(animation.node);
                animation.to(finalNode);
                animation.finalTransform = finalNode.getRawTransformation();
            }
            const timeRemainingInCycle = animation.duration - animation.lastTimeInCycle;
            let amount = (timeInCurrentCycle - animation.lastTimeInCycle) / timeRemainingInCycle;
            if (amount > 1 && (animation.times === 0 || currentCycle < animation.times - 1)) {
                return;
            }
            amount = Math.max(0, amount);
            amount = Math.min(1, amount);

            const interpolated = currentTransform.interpolate(animation.finalTransform, amount);
            animation.node.setRawTransformation(interpolated);

            animation.lastTimeInCycle = timeInCurrentCycle;
        });
    }

    function removeFinishedAnimations(currentTime: number) {
        current = current.filter((animation: AnimationDescription) => {
            if (animation.times === 0) {
                return true;
            }

            if (animation.times === 1) {
                return (currentTime - animation.start) / (animation.duration) < 1;
            }

            return (currentTime - animation.start) / (animation.duration + animation.repeatDelay) < animation.times;
        });
    }
};
