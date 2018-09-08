import { FillVolume } from './FillVolume';
import { Forces, ForcePoint } from './Forces';
import { GuidingCurve, GuidingVectors } from './GuidingVectors';
import { Model } from './Model';

export namespace CostFunction {
    export function forces(forcePoints: ForcePoint[]): Forces {
        return new Forces(forcePoints);
    }

    export function fillVolume(targetModel: Model, cellSize: number): FillVolume {
        return new FillVolume(targetModel, cellSize);
    }

    export function guidingVectors(curves: GuidingCurve[]): GuidingVectors {
        return new GuidingVectors(curves);
    }
}
