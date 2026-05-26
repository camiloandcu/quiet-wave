const COLORS = {
  background: '#051018',
  grid: 'rgba(159, 179, 200, 0.16)',
  text: '#d6e4f1',
  levels: ['#08f1c4', '#b65cff', '#ffb84d']
};

function createOffscreenCanvas(documentObj, width, height) {
  const canvas = documentObj.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  return canvas;
}

function formatTick(value) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)} kHz`;
  }

  return `${Math.round(value)} Hz`;
}

export function createComparisonFigureRenderer(imageElement, options = {}) {
  const documentObj = options.documentObj ?? (typeof document !== 'undefined' ? document : null);
  const width = options.width ?? 1400;
  const height = options.height ?? 800;
  let lastDataUrl = '';

  function draw(comparisonSeries) {
    if (!documentObj || typeof documentObj.createElement !== 'function') {
      return { dataUrl: lastDataUrl };
    }

    const Chart = globalThis.Chart;
    if (!Chart) {
      throw new Error('Chart.js is not available in the browser');
    }

    const canvas = createOffscreenCanvas(documentObj, width, height);
    const context = canvas.getContext('2d');
    const nyquist = comparisonSeries.frequencies[comparisonSeries.frequencies.length - 1] ?? 0;

    const chart = new Chart(context, {
      type: 'line',
      data: {
        datasets: comparisonSeries.levels.map((levelSeries, index) => ({
          label: levelSeries.label,
          data: comparisonSeries.frequencies.map((frequency, frequencyIndex) => ({
            x: frequency,
            y: levelSeries.intensitySeries[frequencyIndex] ?? 0
          })),
          borderColor: COLORS.levels[index % COLORS.levels.length],
          backgroundColor: COLORS.levels[index % COLORS.levels.length],
          pointRadius: 0,
          borderWidth: 3.5,
          tension: 0.25,
          parsing: false
        }))
      },
      options: {
        responsive: false,
        animation: false,
        devicePixelRatio: window.devicePixelRatio || 1,
        layout: {
          padding: {
            top: 18,
            right: 20,
            bottom: 18,
            left: 14
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Average intensity per frequency at 0%, 40%, and 80% cancellation',
            color: COLORS.text,
            font: {
              size: 26,
              family: 'Inter, system-ui, sans-serif',
              weight: '600'
            },
            padding: {
              top: 10,
              bottom: 22
            }
          },
          legend: {
            position: 'top',
            labels: {
              color: COLORS.text,
              usePointStyle: true,
              pointStyle: 'line',
              boxWidth: 20,
              boxHeight: 4,
              padding: 18,
              font: {
                size: 14,
                family: 'Inter, system-ui, sans-serif'
              }
            }
          },
          tooltip: {
            enabled: true,
            backgroundColor: '#0b1220',
            titleColor: COLORS.text,
            bodyColor: COLORS.text,
            borderColor: 'rgba(159, 179, 200, 0.22)',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            type: 'linear',
            min: 0,
            max: nyquist,
            title: {
              display: true,
              text: 'Frequency (Hz)',
              color: COLORS.text,
              font: {
                size: 14,
                family: 'Inter, system-ui, sans-serif'
              }
            },
            ticks: {
              color: COLORS.text,
              callback: (value) => formatTick(value),
              maxRotation: 0,
              autoSkip: true
            },
            grid: {
              color: COLORS.grid,
              drawBorder: true
            }
          },
          y: {
            min: 0,
            max: 1,
            title: {
              display: true,
              text: 'Normalized average intensity',
              color: COLORS.text,
              font: {
                size: 14,
                family: 'Inter, system-ui, sans-serif'
              }
            },
            ticks: {
              color: COLORS.text,
              callback: (value) => `${Math.round(value * 100)}%`
            },
            grid: {
              color: COLORS.grid,
              drawBorder: true
            }
          }
        }
      }
    });

    const dataUrl = chart.toBase64Image('image/png', 1);
    lastDataUrl = dataUrl;

    if (imageElement) {
      imageElement.src = dataUrl;
      imageElement.alt = 'Comparison graph showing average intensity per frequency at 0%, 40%, and 80% cancellation';
      imageElement.hidden = false;
    }

    chart.destroy();
    return { dataUrl };
  }

  function getDataUrl() {
    return lastDataUrl;
  }

  return { draw, getDataUrl };
}
