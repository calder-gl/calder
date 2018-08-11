import { FillVolume } from './FillVolume';
import { Forces, ForcePoint } from './Forces';
import { GuidingVectors } from './GuidingVectors';
import { Model } from './Model';

import 'bezier-js';

export namespace CostFunction {
    export function forces(forcePoints: ForcePoint[]): Forces {
        return new Forces(forcePoints);
    }

    export function fillVolume(targetModel: Model, cellSize: number): FillVolume {
        return new FillVolume(targetModel, cellSize);
    }

    export function guidingVectors(curves: BezierJs.Bezier[]): GuidingVectors {
        return new GuidingVectors(curves);
    }
}
