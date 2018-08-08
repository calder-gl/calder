import { FillVolume } from './FillVolume';
import { Forces, ForcePoint } from './Forces';
import { CostFn } from './Generator';
import { GuidingVectors } from './GuidingVectors';
import { Model } from './Model';

import 'bezier-js';

export namespace CostFunction {
    export function forces(forcePoints: ForcePoint[]): CostFn {
        return new Forces(forcePoints);
    }

    export function fillVolume(targetModel: Model, cellSize: number): CostFn {
        return new FillVolume(targetModel, cellSize);
    }

    export function guidingVectors(
        curves: BezierJs.Bezier[],
        forcePoints: ForcePoint[]
    ): CostFn {
        return new GuidingVectors(curves, forcePoints);
    }
}
