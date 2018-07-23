import { FillVolume } from './FillVolume';
import { Forces, ForcePoint } from './Forces';
import { CostFn } from './Generator';
import { Model } from './Model';

export namespace CostFunction {
    export function forces(forcePoints: ForcePoint[]): CostFn {
        return new Forces(forcePoints);
    }

    export function fillVolume(targetModel: Model, cellSize: number): CostFn {
        return new FillVolume(targetModel, cellSize);
    }
}
