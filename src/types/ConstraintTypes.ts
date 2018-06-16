import { Node } from '../calder';

export type ConstraintCallback = (node: Node) => void;

export type ConstraintWithNode = {
    node: Node;
    constraint: ConstraintCallback;
};
