/**
 * Study Progress SVG Bar Chart Component
 * Dynamically displays real user-entered topics for Monday-Sunday.
 */
class StudyChart {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.data = [
      { day: 'Mon', val: 0 },
      { day: 'Tue', val: 0 },
      { day: 'Wed', val: 0 },
      { day: 'Thu', val: 0 },
      { day: 'Fri', val: 0 },
      { day: 'Sat', val: 0 },
      { day: 'Sun', val: 0 }
    ];
    this.init();
  }

  updateData(newData) {
    if (newData && Array.isArray(newData)) {
      this.data = newData;
      this.render();
    }
  }

  init() {
    this.render();
    window.addEventListener('resize', () => this.render());
  }

  render() {
    if (!this.container) return;
    const width = this.container.clientWidth || 360;
    const height = 180;
    const paddingLeft = 32;
    const paddingBottom = 28;
    const paddingTop = 15;
    const paddingRight = 15;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;
    
    // Dynamic max value
    const highest = Math.max(...this.data.map(d => d.val), 0);
    const maxVal = Math.max(3.0, Math.ceil(highest));

    // Y Axis levels: maxVal, ..., 0
    let yAxisHtml = '';
    const stepCount = 3;
    for (let i = 0; i <= stepCount; i++) {
      const levelVal = Math.round((maxVal / stepCount) * i);
      const yPos = paddingTop + chartHeight - (i / stepCount) * chartHeight;
      yAxisHtml += `
        <text x="${paddingLeft - 8}" y="${yPos + 4}" fill="#94A3B8" font-size="11" font-weight="600" text-anchor="end" font-family="'Plus Jakarta Sans', sans-serif">${levelVal}</text>
        <line x1="${paddingLeft}" y1="${yPos}" x2="${width - paddingRight}" y2="${yPos}" stroke="#EEF2F6" stroke-width="1" stroke-dasharray="${i === 0 ? '0' : '3,3'}" />
      `;
    }

    // Bars
    const barWidth = Math.min(28, (chartWidth / this.data.length) * 0.48);
    const step = chartWidth / this.data.length;

    let barsHtml = '';
    this.data.forEach((item, idx) => {
      const x = paddingLeft + idx * step + (step - barWidth) / 2;
      const barH = item.val > 0 ? Math.max(6, (item.val / maxVal) * chartHeight) : 2;
      const y = paddingTop + chartHeight - barH;
      const barFill = item.val > 0 ? '#6366F1' : '#E2E8F0';

      barsHtml += `
        <g class="chart-bar-group" data-day="${item.day}" data-val="${item.val}">
          <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="5" fill="${barFill}" class="chart-bar-rect" style="transition: all 0.3s ease; cursor: pointer;">
            <title>${item.day}: ${item.val} topics</title>
          </rect>
          <text x="${x + barWidth / 2}" y="${height - 8}" fill="#64748B" font-size="11" font-weight="600" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif">${item.day}</text>
        </g>
      `;
    });

    this.container.innerHTML = `
      <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow: visible;">
        ${yAxisHtml}
        ${barsHtml}
      </svg>
    `;

    // Interactivity
    const rects = this.container.querySelectorAll('.chart-bar-rect');
    rects.forEach(rect => {
      rect.addEventListener('mouseenter', () => {
        rect.setAttribute('fill', '#4F46E5');
        rect.style.transform = 'scaleY(1.04)';
      });
      rect.addEventListener('mouseleave', () => {
        const group = rect.closest('.chart-bar-group');
        const val = parseFloat(group.getAttribute('data-val')) || 0;
        rect.setAttribute('fill', val > 0 ? '#6366F1' : '#E2E8F0');
        rect.style.transform = 'scaleY(1)';
      });
    });
  }
}
