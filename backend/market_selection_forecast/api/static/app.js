let fpInstance;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Flatpickr in range mode
    fpInstance = flatpickr("#date-range-picker", {
        mode: "range",
        dateFormat: "Y-m-d",
        maxDate: new Date(new Date().setDate(new Date().getDate() + 7)),
        defaultDate: [
            new Date(new Date().setDate(new Date().getDate() + 1)), // Tomorrow
            new Date(new Date().setDate(new Date().getDate() + 1))
        ]
    });

    document.getElementById('fetch-btn').addEventListener('click', fetchPredictions);
    
    // Initial fetch
    fetchPredictions();
});

// Global variables for pagination
let allResults = [];
let currentPageIndex = 0;

async function fetchPredictions() {
    const spinner = document.getElementById('loading-spinner');
    const grid = document.getElementById('predictions-grid');
    const errorBox = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const paginationControls = document.getElementById('pagination-controls');

    // Get selected dates
    const selectedDates = fpInstance.selectedDates;
    if (!selectedDates || selectedDates.length === 0) {
        alert("Please select a date range.");
        return;
    }

    let startDateStr = flatpickr.formatDate(selectedDates[0], "Y-m-d");
    let endDateStr = selectedDates.length === 2 ? flatpickr.formatDate(selectedDates[1], "Y-m-d") : startDateStr;

    // Reset UI
    grid.innerHTML = '';
    grid.classList.add('hidden');
    paginationControls.classList.add('hidden');
    errorBox.classList.add('hidden');
    spinner.classList.remove('hidden');

    try {
        const response = await fetch(`/api/predict?start_date=${startDateStr}&end_date=${endDateStr}`);
        const data = await response.json();

        if (!response.ok || data.error) {
            throw new Error(data.error || `HTTP Error ${response.status}`);
        }

        // Status Update
        spinner.classList.add('hidden');
        
        if (!data.results || data.results.length === 0) {
            throw new Error("No data returned for selected range.");
        }

        allResults = data.results;
        currentPageIndex = 0;
        
        setupPaginationControls();
        renderCurrentPage();

    } catch (err) {
        console.error("Prediction Error:", err);
        spinner.classList.add('hidden');
        errorText.textContent = err.message;
        errorBox.classList.remove('hidden');
    }
}

function setupPaginationControls() {
    const paginationControls = document.getElementById('pagination-controls');
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    
    // Remove old listeners by cloning
    const newPrevBtn = prevBtn.cloneNode(true);
    const newNextBtn = nextBtn.cloneNode(true);
    prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
    nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
    
    newPrevBtn.addEventListener('click', () => {
        if (currentPageIndex > 0) {
            currentPageIndex--;
            renderCurrentPage();
        }
    });
    
    newNextBtn.addEventListener('click', () => {
        if (currentPageIndex < allResults.length - 1) {
            currentPageIndex++;
            renderCurrentPage();
        }
    });
    
    // Always show pagination if there is at least 1 day to show the label
    paginationControls.classList.remove('hidden');
}

function formatDateString(dateStr) {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = days[dateObj.getDay()];
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}-${parts[1]}-${parts[0]} (${dayName})`;
}

function renderCurrentPage() {
    const grid = document.getElementById('predictions-grid');
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    const pageLabel = document.getElementById('current-page-label');
    
    // Update controls state
    prevBtn.disabled = currentPageIndex === 0;
    nextBtn.disabled = currentPageIndex === allResults.length - 1;
    
    const dayData = allResults[currentPageIndex];
    const formattedDate = formatDateString(dayData.date);
    
    // Always show date in the pagination label
    pageLabel.textContent = `Predictions for: ${formattedDate}`;
    
    // Hide buttons if only 1 day
    if (allResults.length === 1) {
        prevBtn.style.visibility = 'hidden';
        nextBtn.style.visibility = 'hidden';
    } else {
        prevBtn.style.visibility = 'visible';
        nextBtn.style.visibility = 'visible';
    }
    
    grid.innerHTML = '';
    
    const dayWrapper = document.createElement('div');
    dayWrapper.className = 'day-wrapper';
    
    // If it's a single day, show a Summary & Recommendation Card
    if (allResults.length === 1) {
        const todSlots = dayData.slots.filter(s => s.tod.startsWith('TOD'));
        
        // Find the dominant market based on savings
        const marketSavings = { 'DAM': 0, 'RTM': 0, 'GDAM': 0 };
        let totalDailySavings = 0;
        
        todSlots.forEach(slot => {
            if (marketSavings[slot.prediction] !== undefined) {
                marketSavings[slot.prediction] += slot.savings;
            }
            totalDailySavings += slot.savings;
        });
        
        let bestMarket = 'DAM';
        let maxMarketSavings = -1;
        for (let m in marketSavings) {
            if (marketSavings[m] > maxMarketSavings) {
                maxMarketSavings = marketSavings[m];
                bestMarket = m;
            }
        }
        
        // Calculate Heuristic Confidence based on total savings spread
        // 1000 Rs total daily savings -> ~90% confidence
        let confidence = 35 + (totalDailySavings / 1000) * 55;
        if (confidence > 98.5) confidence = 98.5;
        if (confidence < 35) confidence = 35;
        
        let confText = 'Low';
        let confColor = '#ef4444'; // Red
        if (confidence > 75) {
            confText = 'High';
            confColor = '#10b981'; // Green
        } else if (confidence > 55) {
            confText = 'Medium';
            confColor = '#f59e0b'; // Orange
        }
        
        const summaryHTML = `
            <!-- HIDDEN FOR NOW: change display: none to display: flex to unhide -->
            <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--card-border); border-radius: 1rem; padding: 1.5rem; margin-bottom: 2rem; display: none; justify-content: space-around; align-items: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); flex-wrap: wrap; gap: 1rem;">
                <div style="text-align: center; flex: 1; min-width: 200px;">
                    <div style="font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">Recommended Daily Market</div>
                    <div style="font-size: 2rem; font-weight: 800; color: var(--accent-${bestMarket.toLowerCase()});">${bestMarket}</div>
                </div>
                <div style="width: 1px; height: 50px; background: var(--card-border); display: none; @media(min-width: 768px){display: block;}"></div>
                <div style="text-align: center; flex: 1; min-width: 200px;">
                    <div style="font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">Total Max Savings (Slot-by-Slot)</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: #10b981;">₹${totalDailySavings.toFixed(1)}</div>
                </div>
                <div style="width: 1px; height: 50px; background: var(--card-border); display: none; @media(min-width: 768px){display: block;}"></div>
                <div style="text-align: center; flex: 1; min-width: 200px;">
                    <div style="font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">Model Confidence</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: ${confColor};">${confidence.toFixed(1)}% <span style="font-size: 1rem; font-weight: 500;">(${confText})</span></div>
                </div>
            </div>
        `;
        
        const summaryWrapper = document.createElement('div');
        summaryWrapper.innerHTML = summaryHTML;
        // dayWrapper.appendChild(summaryWrapper); // HIDDEN FOR NOW
    }
    
    dayWrapper.appendChild(createMatrix(dayData.slots));
    grid.appendChild(dayWrapper);
    
    grid.classList.remove('hidden');
}

function createMatrix(slots) {
    const table = document.createElement('table');
    table.className = 'matrix-table';
    
    const todDetails = {
        'TOD-1': { time: '05:00-10:00', type: 'Off Peak' },
        'TOD-2': { time: '10:00-19:00', type: 'Normal' },
        'TOD-3': { time: '19:00-03:00', type: 'Peak' },
        'TOD-4': { time: '03:00-05:00', type: 'Normal' },
        'RTC':   { time: '00:00-24:00', type: 'Round The Clock' }
    };
    
    // Header Row: [Empty, TOD-1, TOD-2, TOD-3, TOD-4]
    const thead = document.createElement('thead');
    let headerHTML = '<tr><th style="vertical-align: bottom;">Market</th>';
    slots.forEach(slot => {
        const seasonIcon = slot.season === 'Summer' ? '☀️' : '❄️';
        const details = todDetails[slot.tod] || { time: '', type: '' };
        
        let extraHTML = '';
        if (details.time) {
            // Pick a color based on type
            let typeColor = 'var(--text-secondary)';
            if (details.type === 'Peak') typeColor = '#ef4444'; // Red for Peak
            else if (details.type === 'Off Peak') typeColor = '#10b981'; // Green for Off Peak
            else if (details.type === 'Normal') typeColor = '#3b82f6'; // Blue for Normal
            else typeColor = '#8b5cf6'; // Purple for RTC

            extraHTML = `
                <div style="font-size: 0.8rem; font-weight: 500; margin-top: 4px; color: var(--text-secondary);">
                    ${details.time}
                </div>
                <div style="font-size: 0.75rem; font-weight: 700; margin-top: 2px; color: ${typeColor}; letter-spacing: 0.05em; text-transform: uppercase;">
                    ${details.type}
                </div>
            `;
        }
        
        headerHTML += `<th>
            <div style="margin-bottom: 2px;">${slot.tod}</div>
            ${extraHTML}
        </th>`;
    });
    headerHTML += '</tr>';
    thead.innerHTML = headerHTML;
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    
    const markets = ['RTM', 'DAM', 'GDAM'];
    const marketKeys = ['rtm', 'dam', 'gdam']; // lowercase for history properties
    
    const formatCurrency = (val) => val != null && val > 0 ? `₹${val.toFixed(1)}` : 'N/A';
    
    markets.forEach((market, idx) => {
        const marketKey = marketKeys[idx];
        const tr = document.createElement('tr');
        
        let rowHTML = `<td class="matrix-row-header">${market}</td>`;
        
        slots.forEach(slot => {
            const isRecommended = slot.prediction === market;
            const savingsStr = `Est. Savings: ₹${slot.savings.toFixed(1)}`;
            
            // Build mini history table for this specific market and slot
            let historyHTML = '<table class="mini-history"><tbody>';
            if (slot.history && slot.history.length > 0) {
                // Determine lowest price per day across ALL markets for color coding
                slot.history.forEach(day => {
                    const prices = [
                        { m: 'dam', p: day.dam },
                        { m: 'rtm', p: day.rtm },
                        { m: 'gdam', p: day.gdam }
                    ].filter(x => x.p != null && x.p > 0);
                    
                    let minPrice = Infinity;
                    let maxPrice = -Infinity;
                    if (prices.length > 0) {
                        minPrice = Math.min(...prices.map(x => x.p));
                        maxPrice = Math.max(...prices.map(x => x.p));
                    }
                    
                    const dayPrice = day[marketKey];
                    let colorClass = 'cell-med';
                    if (dayPrice == null || dayPrice === 0) colorClass = 'cell-na';
                    else if (dayPrice === minPrice) colorClass = 'cell-low';
                    else if (dayPrice === maxPrice) colorClass = 'cell-high';
                    
                    historyHTML += `
                        <tr>
                            <td style="white-space: nowrap;">${formatDateString(day.date)}</td>
                            <td class="${colorClass}">${formatCurrency(dayPrice)}</td>
                        </tr>
                    `;
                });
            } else {
                historyHTML += `<tr><td colspan="2">No data</td></tr>`;
            }
            historyHTML += '</tbody></table>';
            
            // Add rolling mean
            const meanVal = slot[`${marketKey}_mean`];
            const meanHTML = `<div class="matrix-mean">7D Avg: <span>${formatCurrency(meanVal)}</span></div>`;
            
            const cellClass = isRecommended ? `matrix-cell recommended ${market.toLowerCase()}` : 'matrix-cell';
            const recomBadge = `
                <div class="recom-badge" style="visibility: ${isRecommended ? 'visible' : 'hidden'};">★ RECOMMENDED</div>
                <div class="recom-conf" style="visibility: ${(isRecommended && slot.savings > 0) ? 'visible' : 'hidden'};">${savingsStr || 'Est. Savings: ₹0.0'}</div>
            `;
            
            rowHTML += `
                <td class="${cellClass}">
                    <div class="cell-content">
                        ${recomBadge}
                        ${historyHTML}
                        ${meanHTML}
                    </div>
                </td>
            `;
        });
        
        rowHTML += '</tr>';
        tr.innerHTML = rowHTML;
        tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    return table;
}

