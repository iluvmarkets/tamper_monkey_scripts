// ==UserScript==
// @name         Screener Data Visualization
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Color code and visualize data on Screener.in
// @match        https://www.screener.in/company/*
// @grant        GM_addStyle
// ==/UserScript==

// Inject Chart.js
(function() {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    document.head.appendChild(script);
})();

// Wait until Chart.js is loaded
setTimeout(() => {
    const iconUrl = 'https://cdn-icons-png.flaticon.com/512/3281/3281323.png';

    // 1. Add Floating Button
    const button = document.createElement('button');
    button.id = 'floatingBtn';
    button.innerHTML = `<img src="${iconUrl}" width="30" height="30" alt="Show Charts">`;
    document.body.appendChild(button);

    button.addEventListener('click', openPopup);

    GM_addStyle(`
        #floatingBtn {
            position: fixed;
            top: 50%;
            right: 20px;
            z-index: 1000;
            padding: 10px;
            background-color: #212531;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
        #popupModal {
            display: none;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            max-width: 1000px;
            background: #212531;
            color: #e0e0e0;
            z-index: 1001;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
        }
        #popupModal .close {
            float: right;
            cursor: pointer;
            font-size: 20px;
            color: #e0e0e0;
        }
        .chart-column {
            display: flex;
            flex-direction: column;
            gap: 5px;
            flex: 1;
        }
        .chart-container {
            width: 100%;
            padding: 5px 0;
            margin: 2px 0;
            background-color: #14171f;
        }
        .chart-container:nth-child(odd) {
            background-color: #212531;
        }
        .charts-wrapper {
            display: flex;
            justify-content: space-between;
            gap: 10px;
        }
        .column-title {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            color: #e0e0e0;
            margin-bottom: 5px;
        }
        .chart-container canvas {
            width: 90% !important;
            height: 90% !important;
        }
    `);

    // 2. Popup Modal with Columns for Quarterly and Yearly Charts
    const modal = document.createElement('div');
    modal.id = 'popupModal';
    modal.innerHTML = `
        <span class="close" onclick="document.getElementById('popupModal').style.display='none'">&times;</span>
        <div class="charts-wrapper">
            <div class="chart-column">
                <div class="column-title">Quarterly</div>
                <div class="chart-container">
                    <canvas id="quarterlySalesChart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="quarterlyProfitChart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="quarterlyEpsChart"></canvas>
                </div>
            </div>
            <div class="chart-column">
                <div class="column-title">Yearly</div>
                <div class="chart-container">
                    <canvas id="yearlySalesChart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="yearlyProfitChart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="yearlyEpsChart"></canvas>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // 3. Function to open the popup and render both Quarterly and Yearly charts
    function openPopup() {
        document.getElementById('popupModal').style.display = 'block';

        const quarterlyLabels = readChartLabels("#quarters");
        const yearlyLabels = readChartLabels("#profit-loss");

        const quarterlySalesData = readLabelValues("#quarters", "Sales") || readLabelValues("#quarters", "Revenue");
        const quarterlyProfitData = readLabelValues("#quarters", "Net Profit");
        const quarterlyEpsData = readLabelValues("#quarters", "EPS in Rs");
        const yearlySalesData = readLabelValues("#profit-loss", "Sales") || readLabelValues("#profit-loss", "Revenue");
        const yearlyProfitData = readLabelValues("#profit-loss", "Net Profit");
        const yearlyEpsData = readLabelValues("#profit-loss", "EPS in Rs");

        renderChart('quarterlySalesChart', 'Sales / Revenue', quarterlyLabels, quarterlySalesData);
        renderChart('quarterlyProfitChart', 'Net Profit', quarterlyLabels, quarterlyProfitData);
        renderChart('quarterlyEpsChart', 'EPS', quarterlyLabels, quarterlyEpsData);
        renderChart('yearlySalesChart', 'Sales / Revenue', yearlyLabels, yearlySalesData);
        renderChart('yearlyProfitChart', 'Net Profit', yearlyLabels, yearlyProfitData);
        renderChart('yearlyEpsChart', 'EPS', yearlyLabels, yearlyEpsData);
    }

    // 4. Function to render charts with a title and conditional coloring
    function renderChart(canvasId, title, labels, data) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        const colors = data.map((value, index) => {
            const prevValue = index > 0 ? data[index - 1] : value;
            return value < prevValue ? 'rgba(255, 99, 132, 0.7)' : 'rgba(75, 192, 192, 0.7)';
        });
        const borderColors = data.map((value, index) => {
            const prevValue = index > 0 ? data[index - 1] : value;
            return value < prevValue ? 'rgba(255, 99, 132, 1)' : 'rgba(75, 192, 192, 1)';
        });

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: title,
                    data: data,
                    backgroundColor: colors,
                    borderColor: borderColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: title,
                        color: '#e0e0e0',
                        font: { size: 18 }
                    },
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            borderDash: [5, 5]
                        },
                        ticks: { color: '#e0e0e0' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#e0e0e0' }
                    }
                }
            }
        });
    }

    // 5. Functions to read chart labels and values
    function readChartLabels(section) {
        const container = document.querySelector(section);
        const targetRow = container.querySelector("table thead tr");

        if (!targetRow) return;

        const valueCells = Array.from(targetRow.querySelectorAll('th:not(.text)'));
        return valueCells.map(cell => cell.innerText.trim());
    }

    function readLabelValues(section, label) {
        const container = document.querySelector(section);
        const targetRow = Array.from(container.querySelectorAll('tr')).find(row =>
            row.querySelector('td.text')?.innerText.trim() === label ||
            row.querySelector(`button[onclick*="${label}"]`)
        );

        if (!targetRow) return;

        const valueCells = Array.from(targetRow.querySelectorAll('td:not(.text)'));
        return valueCells.map(cell => parseFloat(cell.innerText.replace(/,/g, '')) || 0);
    }

    // Close Modal when clicking outside
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    };

}, 500);
