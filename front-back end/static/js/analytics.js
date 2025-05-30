let distributionChart, trendChart;

const chartColors = {
    metal: 'rgba(255, 167, 38, 0.8)',
    glass: 'rgba(79, 195, 247, 0.8)',
    paper: 'rgba(129, 199, 132, 0.8)',
    plastic: 'rgba(186, 104, 200, 0.8)'
};

document.addEventListener('DOMContentLoaded', () => {
    updateAnalytics();
    initCharts();
    fetchAnalyticsData();
});

function updateAnalytics() {
    const now = new Date();
    document.getElementById('last-updated').textContent = `Last updated: ${now.toLocaleString()}`;
}

function initCharts() {
    const ctx1 = document.getElementById('distributionChart').getContext('2d');
    const ctx2 = document.getElementById('trendChart').getContext('2d');
    
    distributionChart = new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: ['Metal', 'Glass', 'Paper', 'Plastic'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: [
                    chartColors.metal,
                    chartColors.glass,
                    chartColors.paper,
                    chartColors.plastic
                ],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        font: {
                            family: 'Inter',
                            size: 12
                        },
                        padding: 20
                    }
                }
            },
            cutout: '70%'
        }
    });
    
    trendChart = new Chart(ctx2, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [
                {
                    label: 'Metal',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    borderColor: chartColors.metal.replace('0.8', '1'),
                    backgroundColor: chartColors.metal.replace('0.8', '0.1'),
                    tension: 0.3,
                    fill: true,
                    borderWidth: 3
                },
                {
                    label: 'Glass',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    borderColor: chartColors.glass.replace('0.8', '1'),
                    backgroundColor: chartColors.glass.replace('0.8', '0.1'),
                    tension: 0.3,
                    fill: true,
                    borderWidth: 3
                },
                {
                    label: 'Paper',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    borderColor: chartColors.paper.replace('0.8', '1'),
                    backgroundColor: chartColors.paper.replace('0.8', '0.1'),
                    tension: 0.3,
                    fill: true,
                    borderWidth: 3
                },
                {
                    label: 'Plastic',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    borderColor: chartColors.plastic.replace('0.8', '1'),
                    backgroundColor: chartColors.plastic.replace('0.8', '0.1'),
                    tension: 0.3,
                    fill: true,
                    borderWidth: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        font: {
                            family: 'Inter',
                            size: 12
                        },
                        padding: 20
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#9E9E9E',
                        font: {
                            family: 'Inter'
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#9E9E9E',
                        font: {
                            family: 'Inter'
                        }
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

async function fetchAnalyticsData() {
    try {
        const response = await fetch('/api/analytics');
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        document.getElementById('metal-stat').textContent = data.counts.metal;
        document.getElementById('glass-stat').textContent = data.counts.glass;
        document.getElementById('paper-stat').textContent = data.counts.paper;
        document.getElementById('plastic-stat').textContent = data.counts.plastic;
        
        updateCharts(data);
        
    } catch (error) {
        console.error('Error fetching analytics:', error);
    }
}

function updateCharts(data) {
    if (!distributionChart || !trendChart) return;
    
    distributionChart.data.datasets[0].data = [
        data.counts.metal,
        data.counts.glass,
        data.counts.paper,
        data.counts.plastic
    ];
    distributionChart.update();
    
    trendChart.data.datasets[0].data = data.weekly_trends.metal;
    trendChart.data.datasets[1].data = data.weekly_trends.glass;
    trendChart.data.datasets[2].data = data.weekly_trends.paper;
    trendChart.data.datasets[3].data = data.weekly_trends.plastic;
    trendChart.update();
}