import { Node } from '../../armature/Node';
import { DebugParams } from './DebugParams';

export type RenderParams = {
    objects: Node[];

    debugParams?: DebugParams;
};
