// SVG circular progress indicator

export function renderProgressRing(current, total, size = 48, strokeWidth = 4) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? current / total : 0;
  const offset = circumference * (1 - progress);

  return `
    <div class="progress-ring-container">
      <div class="progress-ring">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <circle class="progress-ring-bg" cx="${size/2}" cy="${size/2}" r="${radius}" stroke-width="${strokeWidth}" />
          <circle class="progress-ring-fill" cx="${size/2}" cy="${size/2}" r="${radius}" stroke-width="${strokeWidth}"
            stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" />
        </svg>
      </div>
      <span class="progress-ring-text">${current} of ${total}</span>
    </div>
  `;
}
