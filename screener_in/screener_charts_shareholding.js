// ==UserScript==
// @name         Screener Shareholding Data Visualization
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Color code and visualize data on Screener.in
// @match        https://www.screener.in/company/*
// @grant        GM_addStyle
// ==/UserScript==

// Inject Chart.js
(function() {
    loadChartScript(initialize);
})();

function loadChartScript(callback) {
    // Check if the script is already loaded
    const src = "https://cdn.jsdelivr.net/npm/chart.js"
    if (!document.querySelector(`script[src='${src}']`)) {
        const script = document.createElement('script');
        script.src = src;
        script.onload = callback; // Call the callback (initialize) once the script has loaded
        document.head.appendChild(script);
    } else {
        // Script is already loaded, directly call the callback
        callback();
    }
}

function initialize() {
    const iconUrl = 'https://cdn-icons-png.flaticon.com/512/8567/8567167.png';

    // 1. Add Floating Button
    const button = document.createElement('button');
    button.id = 'floatingBtnShd';
    button.innerHTML = `<img src="${iconUrl}" width="30" height="30" alt="Show Shareholding">`;
    document.body.appendChild(button);

    button.addEventListener('click', openPopup);

    GM_addStyle(`
        :root {
        color-scheme: light dark;
        }        
        #floatingBtnShd {
            position: fixed;
            top: 60%;
            right: 20px;
            z-index: 1000;
            padding: 10px;
            background-color: #212531;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
        #popupModalShd {
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
        #popupModalShd .close {
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
    modal.id = 'popupModalShd';
    modal.innerHTML = `
        <span class="close" onclick="document.getElementById('popupModalShd').style.display='none'">&times;</span>
        <div class="column-title">Shareholding Pattern</div>
        <div class="charts-wrapper">
            <div class="chart-column">
                <div class="chart-container">
                    <canvas id="Chart00"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="Chart01"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="Chart02"></canvas>
                </div>
            </div>
            <div class="chart-column">
                <div class="chart-container">
                    <canvas id="Chart10"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="Chart11"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="Chart12"></canvas>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // 3. Function to open the popup and render both Quarterly and Yearly charts
    function openPopup() {
        document.getElementById('popupModalShd').style.display = 'block';

        const timeLabels = readChartLabels("#shareholding");

        const promotersData = readLabelValues("#shareholding", "Promoters");
        const fiiData = readLabelValues("#shareholding", "FIIs");
        const diiDataData = readLabelValues("#shareholding", "DIIs");
        const govtData = readLabelValues("#shareholding", "Government");
        const publicData = readLabelValues("#shareholding", "Public");
        const shData = readLabelValues("#shareholding", "No. of Shareholders");

        renderChart('Chart00', 'Promoters', timeLabels, promotersData);
        renderChart('Chart01', 'FIIs', timeLabels, fiiData);
        renderChart('Chart02', 'DIIs', timeLabels, diiDataData);
        renderChart('Chart10', 'Public', timeLabels, publicData);
        renderChart('Chart11', 'Government', timeLabels, govtData);
        renderChart('Chart12', 'No. of Shareholders', timeLabels, shData);
    }

    // 4. Function to render charts with a title and conditional coloring
    // Store chart instances by canvas ID
    const chartInstances = {};

    function renderChart(canvasId, title, labels, data) {

        if (!data) {
            return;
        }

        const ctx = document.getElementById(canvasId).getContext('2d');

        // Destroy existing chart instance if it exists
        if (chartInstances[canvasId]) {
            chartInstances[canvasId].destroy();
        }

        const colors = data.map((value, index) => {
            const prevValue = index > 0 ? data[index - 1] : value;
            return value < prevValue ? 'rgba(255, 99, 132, 0.7)' : 'rgba(75, 192, 192, 0.7)';
        });

        const borderColors = data.map((value, index) => {
            const prevValue = index > 0 ? data[index - 1] : value;
            return value < prevValue ? 'rgba(255, 99, 132, 1)' : 'rgba(75, 192, 192, 1)';
        });

        // Create new chart instance and save it
        chartInstances[canvasId] = new Chart(ctx, {
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
        const shp = container.querySelector("#quarterly-shp:not(.hidden), #yearly-shp:not(.hidden)");
        const targetRow = shp.querySelector("table thead tr");

        if (!targetRow) return;

        const valueCells = Array.from(targetRow.querySelectorAll('th:not(.text)'));
        return valueCells.map(cell => cell.innerText.trim());
    }

    function readLabelValues(section, label) {
        const container = document.querySelector(section);
        const shp = container.querySelector("#quarterly-shp:not(.hidden), #yearly-shp:not(.hidden)");

        const targetRow = Array.from(shp.querySelectorAll('tr')).find(row =>
            row.querySelector('td.text')?.innerText.trim() === label ||
            Array.from(row.querySelectorAll('button')).some(button =>
                button.getAttribute('onclick')?.includes(label) || button.innerText.trim().startsWith(label)
            )
        );
        
        if (!targetRow) return;

        const valueCells = Array.from(targetRow.querySelectorAll('td:not(.text)'));
        return valueCells.map(cell => parseFloat(cell.innerText.replace(/,/g, '')) || 0);
    }

    // Close Modal when clicking outside
    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    };

    // Close Modal when pressing the Escape key
    window.onkeydown = function (event) {
        if (event.key === "Escape") {
            modal.style.display = "none";
        }
    };    
}
