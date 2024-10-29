// ==UserScript==
// @name         Screener.in Conditional Formatting with QoQ and YoY Growth
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Apply gradient colors to specified rows and add QoQ% and YoY% Growth rows on Screener.in, after page load
// @match        https://www.screener.in/company/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const ColorScheme = Object.freeze({
        SIMPLE: 'simple',
        GRADIENT: 'gradient'
    });

    //const colorScheme = ColorScheme.SIMPLE;
    //const decimals = 0

    function innerHTMLSimple(value) {
        // Check if the value is NaN (Not a Number)
        if (isNaN(value)) {
            return '';
        }

        // Format the value
        const formattedValue = Math.abs(value).toFixed(decimals) + '%'; // Get the absolute value and format as percentage
        if (value > 0) {
            return `<span class="change up">⇡ ${formattedValue}</span>`;
        } else if (value < 0) {
            return `<span class="change down">⇣ ${formattedValue}</span>`;
        } else {
            return '';
        }
    }

    function innerHTMLGradient(value) {
        const formattedValue = Math.abs(value).toFixed(decimals) + '%';
        return isNaN(value) ? '' : `<span>${formattedValue}</span>`;
    }

    function innerHTML(value) {
        if (colorScheme === ColorScheme.SIMPLE) {
            return innerHTMLSimple(value);
        } else {
            return innerHTMLGradient(value);
        }

    }


    // Function to apply gradient color based on values and add growth rows
    function applyConditionalFormatting(section, label, qoqLabel, qoqGrowth = false, yoyLabel, yoyGrowth = false) {
        const container = document.querySelector(section);
        const targetRow = Array.from(container.querySelectorAll('tr')).find(row =>
            row.querySelector('td.text')?.innerText.trim() === label ||
            row.querySelector(`button[onclick*="${label}"]`)
        );

        if (!targetRow) return; // Exit if the row isn't found

        const valueCells = Array.from(targetRow.querySelectorAll('td:not(.text)'));
        const values = valueCells.map(cell => parseFloat(cell.innerText.replace(/,/g, '')) || 0);

        // Apply gradient to each cell based on its value
        if (colorScheme === ColorScheme.GRADIENT) {
            applyGradientColors(valueCells, values);
        }

        // Add QoQ growth row if specified
        if (qoqGrowth) {
            const qoqRow = document.createElement('tr');
            const titleCell = document.createElement('td');
            titleCell.innerText = qoqLabel;
            qoqRow.appendChild(titleCell);
            qoqRow.appendChild(document.createElement('td')); // Empty cell for alignment

            const qoqGrowthValues = [0];
            for (let i = 1; i < values.length; i++) {
                const previousValue = values[i - 1];
                const currentValue = values[i];
                const qoqGrowthValue = previousValue !== 0 ? ((currentValue - previousValue) / Math.abs(previousValue)) * 100 : (currentValue > 0 ? 100 : -100);
                qoqGrowthValues.push(qoqGrowthValue);
                const growthCell = document.createElement('td');
                growthCell.innerHTML = innerHTML(qoqGrowthValue);
                qoqRow.appendChild(growthCell);
            }
            if (colorScheme === ColorScheme.GRADIENT) {
                applyGradientColors(qoqRow.querySelectorAll('td:not(:first-child)'), qoqGrowthValues);
            }
            targetRow.parentNode.insertBefore(qoqRow, targetRow.nextSibling);
        }

        // Add YoY growth row if specified
        if (yoyGrowth) {
            const yoyRow = document.createElement('tr');
            const yoyTitleCell = document.createElement('td');
            yoyTitleCell.innerText = yoyLabel;
            yoyRow.appendChild(yoyTitleCell);
            for (let i = 0; i < 4; i++) {
                yoyRow.appendChild(document.createElement('td')); // Empty cells for alignment
            }

            const yoyGrowthValues = [0,0,0,0];
            for (let i = 4; i < values.length; i++) {
                const previousValue = values[i - 4];
                const currentValue = values[i];
                const yoyGrowthValue = previousValue !== 0 ? ((currentValue - previousValue) / Math.abs(previousValue)) * 100 : (currentValue > 0 ? 100 : -100);
                yoyGrowthValues.push(yoyGrowthValue);
                const growthCell = document.createElement('td');
                growthCell.innerHTML = innerHTML(yoyGrowthValue);
                yoyRow.appendChild(growthCell);
            }
            if (colorScheme === ColorScheme.GRADIENT) {
                applyGradientColors(yoyRow.querySelectorAll('td:not(:first-child)'), yoyGrowthValues);
            }
            targetRow.parentNode.insertBefore(yoyRow, targetRow.nextSibling);
        }
    }

    // Function to apply gradient colors based on value arrays
    function applyGradientColors(cells, values) {
        //const maxValue = Math.max(...values.map(Math.abs));
        const maxValue = Math.max(...values);
        const minValue = Math.min(...values);

        cells.forEach((cell, index) => {
            const value = values[index];
            if (Number.isFinite(value)) {
                if (value > 0) {
                    // Positive values - apply green gradient
                    let greenIntensity = Math.floor(155 + (value / maxValue * 100));
                    cell.style.backgroundColor = `rgb(25, ${greenIntensity},25,0.7)`;
                } else if (value < 0) {
                    // Negative values - apply red gradient
                    let redIntensity = Math.floor(155 + (value / minValue * 100));
                    cell.style.backgroundColor = `rgb(${redIntensity}, 25,25,0.7`;
                }
            }
        });
    }

    function calculatePercentageFromHigh() {
        // Define the container with class .company-ratios to scope the search
        const container = document.querySelector("div.company-ratios");

        if (!container) {
            console.error("Container not found");
            return;
        }

        let currentPrice = null;
        let highValue = null;
        let currentPriceItem = null;

        // Select all <li> elements within the container
        const listItems = container.querySelectorAll("li");

        // Loop through the <li> elements to find "Current Price" and "High / Low"
        listItems.forEach(item => {
            const nameElement = item.querySelector(".name");

            if (nameElement && nameElement.textContent.trim() === "Current Price") {
                // Extract the current price value
                currentPrice = parseFloat(item.querySelector(".number").textContent.replace(/[^0-9.-]/g, ""));
                currentPriceItem = item;  // Store the current price item to insert the new item after it
            }

            if (nameElement && nameElement.textContent.trim() === "High / Low") {
                // Extract the high value from the "High / Low" <li>
                highValue = parseFloat(item.querySelectorAll(".number")[0].textContent.replace(/[^0-9.-]/g, ""));
            }
        });

        if (currentPrice !== null && highValue !== null && currentPriceItem) {
            // Calculate the percentage from high
            const percentFromHigh = ((currentPrice - highValue) / highValue) * 100;

            // Create a new <li> element to display the result
            const newListItem = document.createElement("li");
            newListItem.className = "flex flex-space-between";
            newListItem.innerHTML = `
            <span class="name">% from High</span>
            <span class="nowrap value"><span class="number">${percentFromHigh.toFixed(decimals)}%</span></span>
        `;

            // Insert the new <li> element right after the "Current Price" item
            currentPriceItem.insertAdjacentElement('afterend', newListItem);
        } else {
            console.error("Current Price or High Value not found in the HTML");
        }
    }

    //Config
    const colorScheme = ColorScheme.GRADIENT; // Valid values: ColorScheme.SIMPLE ColorScheme.GRADIENT
    const decimals = 2; // Valid values: 0, 1, 2

    // Quarterly Results
    applyConditionalFormatting("#quarters", "Revenue", "QoQ% Growth", true, "YoY% Growth", true);
    applyConditionalFormatting("#quarters", "Sales", "QoQ% Growth", true, "YoY% Growth", true);
    applyConditionalFormatting("#quarters", "Net Profit", "QoQ% Growth", true, "YoY% Growth", true);
    //applyConditionalFormatting("#quarters", "EPS in Rs", "QoQ% Growth", true, "YoY% Growth", true);

    // Profit & Loss
    applyConditionalFormatting("#profit-loss", "Revenue", "YoY% Growth", true);
    applyConditionalFormatting("#profit-loss", "Sales", "YoY% Growth", true);
    applyConditionalFormatting("#profit-loss", "Net Profit", "YoY% Growth", true);
    applyConditionalFormatting("#profit-loss", "EPS in Rs", "YoY% Growth", true);

    //Calculate distance from HIGH
    calculatePercentageFromHigh();

})();
