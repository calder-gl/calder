// Create guides to visualize
const guides = [
    new Bezier({x: 45, y: 200}, {x: 120, y: 250}, {x: 120, y: 80}, {x: 250, y: 100}),
    new Bezier({x: 300, y: 300}, {x: 500, y: 100}, {x: 300, y: 20}, {x: 520, y: 50})
];

const SCALE = 2;

const canvas = document.createElement('canvas');
const width = 550;
const height = 400;
canvas.width = width * SCALE;
canvas.height = height * SCALE;
document.body.appendChild(canvas);

const ctx = canvas.getContext('2d');
ctx.lineCap = 'round';

const drawGuides = () => {
    ctx.lineWidth = 4 * SCALE;
    ctx.strokeStyle = '#F0F';
    guides.forEach((bezier) => {
        ctx.beginPath();
        ctx.moveTo(bezier.points[0].x * SCALE, bezier.points[0].y * SCALE);
        ctx.bezierCurveTo(
            bezier.points[1].x * SCALE,
            bezier.points[1].y * SCALE,
            bezier.points[2].x * SCALE,
            bezier.points[2].y * SCALE,
            bezier.points[3].x * SCALE,
            bezier.points[3].y * SCALE
        );
        ctx.stroke();
    });
};

const mix = (a, b, amount) => a.map((_, i) => a[i] * (1 - amount) + b[i] * amount);

const drawVectorField = () => {
    const spacing = 10;

    ctx.lineWidth = 2 * SCALE;

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

            // Map the distance [0, 300] to [0, 1]
            const amount = Math.min(minProj.d/300, 1);

            // Map 0 to green, 0.5 to yellow, 1 to red
            const color =
                amount < 0.5 ?
                mix([0, 220, 0], [255, 255, 0], amount * 2) :
                mix([255, 255, 0], [255, 0, 0], (amount - 0.5) * 2);

            ctx.strokeStyle = `rgb(${Math.round(color[0])}, ${Math.round(color[1])}, ${Math.round(color[2])})`;
            ctx.beginPath();

            // Draw a line of length spacing / 3 * 2, centered at the point (x, y)
            ctx.moveTo((x - derivative.x * spacing / 3) * SCALE, (y - derivative.y * spacing / 3) * SCALE);
            ctx.lineTo((x + derivative.x * spacing / 3) * SCALE, (y + derivative.y * spacing / 3) * SCALE);
            ctx.stroke();
        }
    }
}

drawVectorField();
drawGuides();
