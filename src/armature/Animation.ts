import { Node } from './Node';
import { Transformation } from './Transformation';

type AnimationDescription = {
    node: Node;
    to: Transformation;
    curve: string;
    start: number;
    duration: number;
    times: number;
    repeatDelay: number;
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
        const finalNode = Node.clone(params.node);
        params.to(finalNode);

        const animation = {
            node: params.node,
            to: finalNode.getRawTransformation(),
            curve: params.curve !== undefined ? params.curve : 'linear',
            start: params.start !== undefined ? params.start : now(),
            duration: params.duration,
            times: params.times !== undefined ? params.times : 1,
            repeatDelay: params.repeatDelay !== undefined ? params.repeatDelay : 0
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

            let currentCycle = Math.floor(currentTime / period);
            if (animation.times > 0) {
                currentCycle = Math.max(animation.times, currentCycle);
            }

            let amount = (currentTime - animation.start - currentCycle * period) / animation.duration;
            amount = Math.max(0, amount);
            amount = Math.min(1, amount);

            animation.node.setRawTransformation(currentTransform.interpolate(animation.to, amount));
        })
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
