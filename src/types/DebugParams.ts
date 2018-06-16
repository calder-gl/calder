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
};
