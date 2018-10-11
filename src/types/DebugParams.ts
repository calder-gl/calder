import 'bezier-js';

export type GuidingCurveInfo = {
    path: [number, number, number][];
    selected: boolean;
    bezier: BezierJs.Bezier;
};

/*
 * A collection of behaviours in Renderer that enable easier visual debugging of
 * geometry and armatures.
 */
export type DebugParams = {
    /**
     * Draws the cross-hairs for the axes in the bottom left-hand corner of the
     * screen.
     */
    drawAxes?: boolean;

    /**
     * Draw a shape representing the relation of a `Node` to its parent, on top
     * of the rest of the image so it's visible.
     */
    drawArmatureBones?: boolean;

    /**
     * Draw a vector field in the 3D view, where the array is given as three components of a
     * point followed by the three components of the end point of the vector.
     */
    drawVectorField?: Float32Array;

    /**
     * Draw a guiding curve, represented as an array of points along the curve.
     */
    drawGuidingCurve?: GuidingCurveInfo[];

    /**
     * Draw a line on the screen, represented as a polyline.
     */
    drawPencilLine?: { x: number; y: number }[];
};
