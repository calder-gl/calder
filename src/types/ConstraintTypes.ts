import { Node } from '../armature/Node';

export type ConstraintCallback = (node: Node) => void;

export type ConstraintWithNode = {
    node: Node;
    constraint: ConstraintCallback;
};
