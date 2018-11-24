import {
    emptyCost,
    Armature,
    Generator,
    GeneratorInstance,
    GeometryNode,
    Light,
    Material,
    Model,
    Node,
    Point,
    Renderer,
    RGBColor,
    Shape
} from '../calder';

// Create the renderer
const ambientLightColor = RGBColor.fromRGB(90, 90, 90);
const renderer: Renderer = new Renderer({
    width: 800,
    height: 600,
    maxLights: 2,
    ambientLightColor,
    backgroundColor: RGBColor.fromHex('#FFDDFF')
});

// Create light sources for the renderer
const light1: Light = Light.create({
    position: { x: 10, y: 10, z: 10 },
    color: RGBColor.fromHex('#FFFFFF'),
    strength: 200
});

// Add lights to the renderer
renderer.addLight(light1);

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 1: create geometry
///////////////////////////////////////////////////////////////////////////////////////////////////

// Setup leaf
const leafColor = RGBColor.fromRGB(204, 255, 204);
const leafSphere: Node = new GeometryNode(
    Shape.sphere(Material.create({ color: leafColor, shininess: 100 }))
);
const leafModel = new Model([leafSphere]);

// Setup branch
const branchColor = RGBColor.fromRGB(102, 76.5, 76.5);
const branchShape = Shape.cylinder(Material.create({ color: branchColor, shininess: 1 }));

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 2: create armature
///////////////////////////////////////////////////////////////////////////////////////////////////

const bone = Armature.define((root: Node) => {
    root.createPoint('base', { x: 0, y: 0, z: 0 });
    root.createPoint('mid', { x: 0, y: 0.5, z: 0 });
    root.createPoint('tip', { x: 0, y: 1, z: 0 });
    root.createPoint('handle', { x: 1, y: 0, z: 0 });
});

const treeGen = Armature.generator();
treeGen
    .define('branch', (root: Point) => {
        const node = bone();
        node.point('base').stickTo(root);
        node.scale(Math.random() * 0.4 + 0.9);
        node
            .hold(node.point('tip'))
            .rotate(Math.random() * 360)
            .release();
        node
            .hold(node.point('handle'))
            .rotate(Math.random() * 60)
            .release();
        node.scale(0.8); // Shrink a bit

        Generator.decorate(() => {
            const trunk = node.point('mid').attach(branchShape);
            trunk.scale({ x: 0.2, y: 1, z: 0.2 });
        });

        Generator.addDetail({ component: 'branchOrLeaf', at: node.point('tip') });
    })
    .defineWeighted('branchOrLeaf', 1, (root: Point) => {
        Generator.addDetail({ component: 'leaf', at: root });
    })
    .defineWeighted('branchOrLeaf', 7, (root: Point) => {
        Generator.addDetail({ component: 'branch', at: root });
        Generator.addDetail({ component: 'maybeBranch', at: root });
        Generator.addDetail({ component: 'maybeBranch', at: root });
    })
    .define('leaf', (root: Point) => {
        const leaf = root.attachModel(leafModel);
        leaf.scale(Math.random() * 0.5 + 0.5);
    })
    .maybe('maybeBranch', (root: Point) => {
        Generator.addDetail({ component: 'branch', at: root });
    })
    .wrapUpMany(['branch', 'branchOrLeaf', 'maybeBranch'], Generator.replaceWith('leaf'))
    .thenComplete(['leaf']);

const instances: GeneratorInstance[] = [];
const advanceInstances = () =>
    instances.forEach((instance: GeneratorInstance) => {
        Generator.withContext(instance, () => {
            for (let i = 0; i < 5; i += 1) {
                instance.growIfPossible(true);
            }
        });
    });
const branchInstance = () => instances.push(instances[instances.length - 1].clone());

instances.push(new GeneratorInstance(treeGen, { getCost: () => emptyCost }));
instances[0].initialize('branch');

for (let i = 0; i < 12; i += 1) {
    branchInstance();
    advanceInstances();
}

instances.forEach((instance: GeneratorInstance) =>
    Generator.withContext(instance, () => instance.finishGeneration())
);

const models = instances.map((i: GeneratorInstance) => i.getModel());
let currentModel = models[0];

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 3: set up renderer
///////////////////////////////////////////////////////////////////////////////////////////////////

document.body.appendChild(renderer.stage);

const buttonContainer = document.createElement('p');
models.map((_: Model, i: number) => {
    const button = document.createElement('button');
    button.innerText = `View model ${i}`;
    button.addEventListener('click', () => {
        currentModel = models[i];
    });
    buttonContainer.appendChild(button);
});
document.body.appendChild(buttonContainer);

renderer.camera.lookAt({ x: 0, y: 0, z: -1 });
renderer.camera.moveToWithFixedTarget({ x: 0, y: 0, z: 0 });
renderer.camera.moveTo({ x: 0, y: 2, z: 10 });

const draw = () => {
    return {
        objects: [currentModel],
        debugParams: {
            drawAxes: false,
            drawArmatureBones: false
        }
    };
};

// Apply the constraints each frame.
renderer.eachFrame(draw);

///////////////////////////////////////////////////////////////////////////////////////////////////
// Step 4: add .obj export
///////////////////////////////////////////////////////////////////////////////////////////////////

const exportBtn = document.createElement('button');
exportBtn.innerText = 'Export .obj';
exportBtn.addEventListener('click', () => {
    models.forEach((model: Model, i: number) => {
        const obj = model.exportOBJ('calderExport', ambientLightColor);

        const objLink = document.createElement('a');
        objLink.style.display = 'none';
        document.body.appendChild(objLink);

        // Download obj
        const blob = new Blob([obj.obj], { type: 'text/plain;charset=utf-8' });
        objLink.setAttribute('href', URL.createObjectURL(blob));
        objLink.setAttribute('download', `calderExport${i}.obj`);
        objLink.click();
        document.body.removeChild(objLink);
    });
});
document.body.appendChild(exportBtn);

const exportMTLBtn = document.createElement('button');
exportMTLBtn.innerText = 'Export .mtl';
exportMTLBtn.addEventListener('click', () => {
    const obj = currentModel.exportOBJ('calderExport', ambientLightColor);

    const mtlLink = document.createElement('a');
    mtlLink.style.display = 'non';
    document.body.appendChild(mtlLink);

    // Download mtl
    const blob = new Blob([obj.mtl], { type: 'text/plain;charset=utf-8' });
    mtlLink.setAttribute('href', URL.createObjectURL(blob));
    mtlLink.setAttribute('download', 'calderExport.mtl');
    mtlLink.click();
    document.body.removeChild(mtlLink);
});
document.body.appendChild(exportMTLBtn);
