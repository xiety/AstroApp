export function drawCirclePath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
}

export function getVisualScaleRadius(radius: number, k: number, minPx: number): number {
  const visualRadius = radius * k;
  if (visualRadius < minPx) {
    return minPx / k;
  }
  return radius;
}
