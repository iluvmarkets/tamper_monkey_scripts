// ==UserScript==
// @name         Screener Shareholding Data Visualization
// @namespace    http://tampermonkey.net/
// @version      5.0
// @description  Color code and visualize data on Screener.in
// @match        https://www.screener.in/company/*
// @grant        GM_addStyle
// ==/UserScript==

// Inject Chart.js
(function() {
    loadChartScript()
        .then(initialize)
        .catch(error => console.error('Script load error:', error));
})();

function loadChartScript() {
    return new Promise((resolve, reject) => {
        const src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.6";
        if (!document.querySelector(`script[src='${src}']`)) {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve; // Resolve the promise once the script has loaded
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`)); // Reject if there's an error
            document.head.appendChild(script);
        } else {
            resolve(); // Script is already loaded, resolve immediately
        }
    });
}

function initialize() {

    GM_addStyle(`
        .floatingBtn {
            position: fixed;
            right: 20px;
            z-index: 1000;
            padding: 10px;
            background-color: var(--base);
            border: none;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }

        .button1 {
            top: 45%;
        }

        .button2 {
            top: 55%;
        }
        

        #popupModalShd {
            display: none;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            max-width: 1000px;
            background-color: var(--page-base);
            color: var(--ink-900);
            /*color: #e0e0e0;*/
            z-index: 1001;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
        }

        #popupModalShd .close {
            float: right;
            cursor: pointer;
            font-size: 20px;
            color: var(--ink-900);
            background-color: var(--base);
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
            background-color: var(--base);
        }

    /*
        .chart-container:nth-child(odd) {
            background-color: var(--page-base);
        }
    */

        .charts-wrapper {
            display: flex;
            justify-content: space-between;
            gap: 10px;
        }

         .chart-title {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            color: var(--ink-900); /*#e0e0e0;*/
            margin-bottom: 5px;
        }       

        .column-title {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            color: var(--ink-900); /*#e0e0e0;*/
            margin-bottom: 5px;
        }

        .chart-container canvas {
            width: 90% !important;
            height: 90% !important;
        }

    `);

    function addButton1() {
        const iconUrl = 'https://cdn-icons-png.flaticon.com/512/3281/3281323.png';
    
        // 1. Add Floating Button
        const button = document.createElement('button');
        button.className = "floatingBtn button1"
        button.innerHTML = `<img src="${iconUrl}" width="30" height="30" alt="Show Fundamentals">`;
        document.body.appendChild(button);
    
        button.addEventListener('click', openPopupFund);
    }
    
    function addButton2() {
        const iconUrl = 'https://cdn-icons-png.flaticon.com/512/8567/8567167.png';
    
        // 1. Add Floating Button
        const button = document.createElement('button');
        button.className = "floatingBtn button2"
        button.innerHTML = `<img src="${iconUrl}" width="30" height="30" alt="Show Shareholding">`;
        document.body.appendChild(button);
    
        button.addEventListener('click', openPopupShd);
    }    

    addButton1();
    addButton2();

    // 2. Popup Modal with Columns for Quarterly and Yearly Charts
    const modal = document.createElement('div');
    modal.id = 'popupModalShd';
    modal.innerHTML = `
        <span class="close" onclick="document.getElementById('popupModalShd').style.display='none'">&times;</span>
        <div class="chart-title" id="chart-title">Shareholding Pattern</div>
        <div class="charts-wrapper">
            <div class="chart-column">
                <div class="column-title" id="column-title-1">Quarterly</div>
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
                <div class="column-title" id="column-title-2">Yearly</div>
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
    function openPopupShd() {
        const modal = document.getElementById('popupModalShd');
        modal.querySelector('#chart-title').textContent = "Shareholding Pattern";
        modal.querySelector('#column-title-1').style.display = 'none';
        modal.querySelector('#column-title-2').style.display = 'none';
        modal.style.display = 'block';

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

    // 3. Function to open the popup and render both Quarterly and Yearly charts
    function openPopupFund() {
        const modal = document.getElementById('popupModalShd');
        modal.querySelector('#chart-title').textContent = "Stock Fundamentals";
        modal.querySelector('#column-title-1').style.display = 'block';
        modal.querySelector('#column-title-2').style.display = 'block';
        modal.style.display = 'block';

        const quarterlyLabels = readChartLabelsFund("#quarters");
        const yearlyLabels = readChartLabelsFund("#profit-loss");

        const quarterlySalesData = readLabelValuesFund("#quarters", "Sales") || readLabelValuesFund("#quarters", "Revenue");
        const quarterlyProfitData = readLabelValuesFund("#quarters", "Net Profit");
        const quarterlyEpsData = readLabelValuesFund("#quarters", "EPS in Rs");
        const yearlySalesData = readLabelValuesFund("#profit-loss", "Sales") || readLabelValuesFund("#profit-loss", "Revenue");
        const yearlyProfitData = readLabelValuesFund("#profit-loss", "Net Profit");
        const yearlyEpsData = readLabelValuesFund("#profit-loss", "EPS in Rs");

        renderChart('Chart00', 'Sales / Revenue', quarterlyLabels, quarterlySalesData);
        renderChart('Chart01', 'Net Profit', quarterlyLabels, quarterlyProfitData);
        renderChart('Chart02', 'EPS', quarterlyLabels, quarterlyEpsData);
        renderChart('Chart10', 'Sales / Revenue', yearlyLabels, yearlySalesData);
        renderChart('Chart11', 'Net Profit', yearlyLabels, yearlyProfitData);
        renderChart('Chart12', 'EPS', yearlyLabels, yearlyEpsData);
    }

    function getCSSVariable(element, varName) {
        return getComputedStyle(element).getPropertyValue(varName).trim();
    }

    // 4. Function to render charts with a title and conditional coloring
    // Store chart instances by canvas ID
    const chartInstances = {};

    function renderChart(canvasId, title, labels, data) {

        if (chartInstances[canvasId]) {
            chartInstances[canvasId].destroy();
        }        

        if (!data) {
            return;
        }

        const ctx = document.getElementById(canvasId).getContext('2d');

        // Read the color from CSS variable
        const chartTitleColor = getCSSVariable(document.getElementById(canvasId), '--ink-900');
        const tickColor = getCSSVariable(document.getElementById(canvasId), '--ink-700');


        // Destroy existing chart instance if it exists
        if (chartInstances[canvasId]) {
            chartInstances[canvasId].destroy();
        }

        const colors = data.map((value, index) => {
            const prevValue = index > 0 ? data[index - 1] : value;
            //return value < prevValue ? 'rgba(255, 99, 132, 0.7)' : 'rgba(75, 192, 192, 0.7)';
            return value < prevValue ? 'rgba(242, 54, 69, 0.7)' : 'rgba(8, 153, 129, 0.7)';
        });

        //const borderColors = data.map((value, index) => {
        //    const prevValue = index > 0 ? data[index - 1] : value;
        //    //return value < prevValue ? 'rgba(255, 99, 132, 1)' : 'rgba(75, 192, 192, 1)';
        //    return value < prevValue ? 'rgba(242, 54, 69, 0.5)' : 'rgba(8, 153, 129, 0.5)';
        //});

        // Create new chart instance and save it
        chartInstances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: title,
                    data: data,
                    backgroundColor: colors,
                    //borderColor: borderColors,
                    borderSkipped: true,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                animation: false,
                plugins: {
                    title: {
                        display: true,
                        text: title,
                        color: chartTitleColor,
                        font: { size: 18 }
                    },
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(96, 111, 123,0.2)',
                            //color: chartTitleColor,
                            borderDash: [5, 5]
                        },
                        //ticks: { color: '#e0e0e0' }
                        ticks: { color: tickColor }
                    },
                    x: {
                        grid: { display: false },
                        //ticks: { color: '#e0e0e0' }
                        ticks: { color: tickColor }
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


    // 5. Functions to read chart labels and values
    function readChartLabelsFund(section) {
        const container = document.querySelector(section);
        const targetRow = container.querySelector("table thead tr");

        if (!targetRow) return;

        const valueCells = Array.from(targetRow.querySelectorAll('th:not(.text)'));
        return valueCells.map(cell => cell.innerText.trim());
    }

    function readLabelValuesFund(section, label) {
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
