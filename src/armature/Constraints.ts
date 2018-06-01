import { ConstraintCallback, ConstraintWithNode } from '../types/ConstraintTypes';
import { Node } from './Node';

/**
 * User facing constraint on an armature which a user may define.
 */
export class Constraints {
    private static instance: Constraints | null = null;
    private constraints: ConstraintWithNode[] = [];

    private constructor() {
        this.constraints = [];
    }

    public static getInstance(): Constraints {
        if (Constraints.instance === null) {
            Constraints.instance = new Constraints();
        }

        return Constraints.instance;
    }

    /**
     * Adds a constraint function to the array of constraints.
     */
    public add(node: Node, constraint: ConstraintCallback) {
        this.constraints.push({ node, constraint });
    }

    /**
     * Applies all the constraints in sequential order.
     */
    public applyAll() {
        this.constraints.forEach((c: ConstraintWithNode) => {
            c.constraint(c.node);
        });
    }
}
