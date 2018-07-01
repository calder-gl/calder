import { Model } from '../armature/Model';
import { DebugParams } from '../calder';

export type RenderParams = {
    objects: Model[];

    debugParams?: DebugParams;
};
