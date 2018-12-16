const ns = 'http://www.w3.org/2000/svg';

// Create guides to visualize
const guides = [
    new Bezier({x: 45, y: 200}, {x: 120, y: 250}, {x: 120, y: 80}, {x: 250, y: 100}),
    new Bezier({x: 300, y: 300}, {x: 500, y: 100}, {x: 300, y: 20}, {x: 520, y: 50})
];

const svg = document.querySelector('svg');
const width = 550;
const height = 400;
svg.setAttribute('width', 1.5*width);
svg.setAttribute('height', 1.5*height);
svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

const drawGuides = () => {
    const path = document.createElementNS(ns, 'path');
    let d = "";
    guides.forEach((bezier) => {
        d +=
            `M${bezier.points[0].x},${bezier.points[0].y} ` +
            `C${bezier.points[1].x},${bezier.points[1].y},` +
            `${bezier.points[2].x},${bezier.points[2].y},` +
            `${bezier.points[3].x},${bezier.points[3].y} `;
    });
    path.setAttribute('d', d);
    path.setAttribute('style', 'stroke: #F0F; stroke-width: 4; fill: none;');
    svg.appendChild(path);
};

const mix = (a, b, amount) => a.map((_, i) => a[i] * (1 - amount) + b[i] * amount);

const drawVectorField = () => {
    const spacing = 10;

    for (let x = spacing; x < width; x += spacing) {
        for (let y = spacing; y < height; y += spacing) {
            let minProj = null;
            let minGuide = null;
            guides.forEach((bezier) => {
                const proj = bezier.project({x, y});
                if (!minProj || proj.d < minProj.d) {
                    minProj = proj;
                    minGuide = bezier;
                }
            });

            const derivative = minGuide.derivative(minProj.t);
            const length = Math.hypot(derivative.x, derivative.y);
            derivative.x /= length;
            derivative.y /= length;

            // Map the squared distance [0, 40000] to [0, 1]
            const amount = Math.min(minProj.d*minProj.d/40000, 1);

            // Map 0 to green, 0.5 to yellow, 1 to red
            const color =
                amount < 0.2 ?
                mix([0, 220, 0], [255, 255, 0], amount / 0.2) :
                mix([255, 255, 0], [255, 0, 0], (amount - 0.2) / 0.8);


            const x1 = x - derivative.x * spacing / 3;
            const y1 = y - derivative.y * spacing / 3;
            const x2 = x + derivative.x * spacing / 3;
            const y2 = y + derivative.y * spacing / 3;

            const path = document.createElementNS(ns, 'path');
            path.setAttribute('d', `M${x1},${y1} L${x2},${y2}`);
            path.setAttribute('style', `stroke:rgb(${Math.round(color[0])}, ${Math.round(color[1])}, ${Math.round(color[2])}); stroke-width: 2; fill: none;`);
            svg.appendChild(path);
        }
    }
}

drawVectorField();
drawGuides();
