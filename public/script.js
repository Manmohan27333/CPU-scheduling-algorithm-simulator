// --- b/file:///c%3A/Users/BHAVESH/OneDrive/Desktop/os%20calculator/script.js
document.addEventListener('DOMContentLoaded', function () {
    // --- DOM Elements ---
    const algorithmSelect = document.getElementById('algorithm-select');
    const timeQuantumContainer = document.getElementById('time-quantum-container');
    const timeQuantumInput = document.getElementById('time-quantum');
    const infoText = document.getElementById('info-text');
    const processInputsContainer = document.getElementById('process-inputs');
    const addProcessBtn = document.getElementById('add-process-btn');
    const calculateBtn = document.getElementById('calculate-btn');
    const resultsSection = document.getElementById('results-section');
    const errorMessageDiv = document.getElementById('error-message');
    const errorTextSpan = document.getElementById('error-text');
    const stepByStepContainer = document.getElementById('step-by-step-container');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const geminiPromptInput = document.getElementById('gemini-prompt');
    const geminiGenerateBtn = document.getElementById('gemini-generate-btn');
    const geminiAnalyzeBtn = document.getElementById('gemini-analyze-btn');
    const geminiAnalysisContainer = document.getElementById('gemini-analysis-container');

    let processCount = 0;
    let finalProcessesState = [];
    let currentSortState = { column: null, direction: 'asc' };

    const infoTexts = { /* ... omitted for brevity ... */ };

    // --- Dark Mode ---
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        darkModeToggle.checked = true;
    } else {
        document.documentElement.classList.remove('dark');
        darkModeToggle.checked = false;
    }
    darkModeToggle.addEventListener('change', () => {
        if (darkModeToggle.checked) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            console.log('Theme changed: Night mode enabled');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            console.log('Theme changed: Night mode disabled');
        }
    });

    // --- Gemini API Call Function ---
    async function callGemini(payload) {
        const apiUrl = "https://cpu-scheduling-algorithm-simulator.onrender.com/api/gemini";
        let retries = 3;
        let delay = 1000;
        while (retries > 0) {
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    const errorBody = await response.json();
                    // Show user-friendly error, suppress console error
                    showError(`Gemini API error: ${response.status} - ${errorBody.error?.message || response.statusText}`);
                    return null;
                }
                const result = await response.json();
                // Gemini API response is proxied, so check for candidates
                const candidate = result.candidates?.[0];
                if (candidate && candidate.content?.parts?.[0]?.text) {
                    return candidate.content.parts[0].text;
                } else {
                    showError("Gemini API returned an unexpected response. Please try again later.");
                    return null;
                }
            } catch (error) {
                // Show user-friendly error, suppress console error
                showError("Gemini API call failed. Please check your connection or try again later.");
                retries--;
                if (retries === 0) {
                    return null;
                }
                await new Promise(res => setTimeout(res, delay));
                delay *= 2;
            }
        }
    }

    // --- Gemini Feature: Smart Process Generation ---
    geminiGenerateBtn.addEventListener('click', async () => {
        console.log('Gemini Generate button clicked');
        const userPrompt = geminiPromptInput.value.trim();
        if (!userPrompt) {
            showError("Please enter a scenario for process generation.");
            return;
        }
        // Use Gemini to identify the algorithm from the prompt
        let detectedAlgorithm = null;
        const algoSystemPrompt = `You are an expert in operating systems. Given the following user prompt, identify the most suitable CPU scheduling algorithm from this list: FCFS, SJF (Non-Preemptive), SRTF (Preemptive SJF), Round Robin, Priority (Non-Preemptive), Priority (Preemptive). Reply with only the exact algorithm code from this list: fcfs, sjf-np, srtf, rr, priority-np, priority-p. If the prompt mentions 'priority' but not 'preemptive', select 'priority-np'. If ambiguous, choose the most likely intended algorithm.`;
        const algoPayload = {
            contents: [{ parts: [{ text: `Prompt: "${userPrompt}"` }] }],
            systemInstruction: { parts: [{ text: algoSystemPrompt }] }
        };
        let algoCode = null;
        const validAlgos = ['fcfs', 'sjf-np', 'srtf', 'rr', 'priority-np', 'priority-p'];
        try {
            const algoResponse = await callGemini(algoPayload);
            algoCode = (algoResponse || '').trim().toLowerCase();
            // Explicit mapping for ambiguous Gemini responses
            if (algoCode.includes('sjf') && algoCode.includes('preemptive')) algoCode = 'srtf';
            if (algoCode === 'sjf') algoCode = 'sjf-np';
            if (algoCode === 'priority' || (algoCode.includes('priority') && !algoCode.includes('preemptive'))) algoCode = 'priority-np';
            if (algoCode === 'priority preemptive') algoCode = 'priority-p';
            if (validAlgos.includes(algoCode)) {
                algorithmSelect.value = algoCode;
                algorithmSelect.dispatchEvent(new Event('change'));
                detectedAlgorithm = algoCode;
            } else {
                // Fallback to local regex detection if Gemini response is invalid
                const algoMap = [
                    { key: /sjf(?!.*preemptive)/i, value: 'sjf-np' },
                    { key: /srtf|sjf.*preemptive/i, value: 'srtf' },
                    { key: /fcfs|first[- ]come|firstcome|fcsf|fcfs/i, value: 'fcfs' },
                    { key: /rr|round robin|rounrobin|robin/i, value: 'rr' },
                    { key: /priority.*preemptive|preemptive priority|priorityp/i, value: 'priority-p' },
                    { key: /priority(?!.*preemptive)/i, value: 'priority-np' },
                    { key: /using priority|priority$/i, value: 'priority-np' }
                ];
                for (const { key, value } of algoMap) {
                    if (key.test(userPrompt)) {
                        algorithmSelect.value = value;
                        algorithmSelect.dispatchEvent(new Event('change'));
                        detectedAlgorithm = value;
                        break;
                    }
                }
            }
        } catch (e) {
            // If Gemini fails, fallback to local regex detection
            const algoMap = [
                { key: /sjf(?!.*preemptive)/i, value: 'sjf-np' },
                { key: /srtf|sjf.*preemptive/i, value: 'srtf' },
                { key: /fcfs|first[- ]come|firstcome|fcsf|fcfs/i, value: 'fcfs' },
                { key: /rr|round robin|rounrobin|robin/i, value: 'rr' },
                { key: /priority.*preemptive|preemptive priority|priorityp/i, value: 'priority-p' },
                { key: /priority(?!.*preemptive)/i, value: 'priority-np' },
                { key: /using priority|priority$/i, value: 'priority-np' }
            ];
            for (const { key, value } of algoMap) {
                if (key.test(userPrompt)) {
                    algorithmSelect.value = value;
                    algorithmSelect.dispatchEvent(new Event('change'));
                    detectedAlgorithm = value;
                    break;
                }
            }
        }

        // Wait for dropdown to update before generating process rows
        await new Promise(res => setTimeout(res, 100));

        // Parse process count and values from prompt
        let processMatches = userPrompt.match(/process(?:es)?\s+p(\d+)\s*(?:to|-)?\s*p(\d+)/i);
        let arrivalMatches = userPrompt.match(/arrival\s*times?\s*:?\s*([\d,\s]+)/i);
        let burstMatches = userPrompt.match(/burst\s*time(?:s)?\s*:?\s*([\d,\s]+)/i);
        let processCount = 0;
        let arrivals = [], bursts = [];
        if (processMatches) {
            let start = parseInt(processMatches[1]);
            let end = parseInt(processMatches[2]);
            if (!isNaN(start) && !isNaN(end) && end >= start) {
                processCount = end - start + 1;
            }
        }
        if (arrivalMatches) {
            arrivals = arrivalMatches[1].split(/,|\s+/).map(x => x.trim()).filter(x => x !== '').map(Number);
        }
        if (burstMatches) {
            bursts = burstMatches[1].split(/,|\s+/).map(x => x.trim()).filter(x => x !== '').map(Number);
        }
        // If process count is found, replace all process rows
        if (processCount > 0) {
            processInputsContainer.innerHTML = '';
            for (let i = 0; i < processCount; i++) {
                let pid = `P${i}`;
                let arrival = arrivals[i] !== undefined ? arrivals[i] : '';
                let burst = bursts[i] !== undefined ? bursts[i] : '';
                // Validate arrival and burst
                if (arrival === '' || burst === '' || isNaN(arrival) || isNaN(burst) || arrival < 0 || burst <= 0) {
                    showError('Invalid input: Please provide valid arrival and burst times for all processes.');
                    return;
                }
                // If priority algorithm, add default priorities
                let priorityVal = '';
                if (detectedAlgorithm === 'priority-np' || detectedAlgorithm === 'priority-p') {
                    priorityVal = i + 1; // simple default priority
                }
                createProcessInput(pid, arrival, burst, priorityVal);
            }
            // Ignore Gemini-generated processes if prompt specifies count
            return;
        }

        toggleSpinner('gemini-generate', true);
        errorMessageDiv.classList.add('hidden');

        // Get selected algorithm name for Gemini context
        const selectedAlgorithmText = algorithmSelect.options[algorithmSelect.selectedIndex].text;
        const systemPrompt = `You are a computer science professor specializing in operating systems. Generate a set of 4 to 6 sample processes that fit the user's scenario and are suitable for the following scheduling algorithm: ${selectedAlgorithmText}. Provide realistic and varied arrival times, burst times, and priorities (from 1-10, lower is higher priority) if the algorithm uses priority. Arrival times should start near 0. Burst times should be greater than 0. The output must be a valid JSON array of objects.`;

        const schema = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    pid: { type: "STRING" },
                    arrivalTime: { type: "NUMBER" },
                    burstTime: { type: "NUMBER" },
                    priority: { type: "NUMBER" }
                },
                required: ["pid", "arrivalTime", "burstTime", "priority"]
            }
        };

        const payload = {
            contents: [{ parts: [{ text: `Scenario: "${userPrompt}"` }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        };

        try {
            const responseJson = await callGemini(payload);
            const generatedProcesses = JSON.parse(responseJson);

            processInputsContainer.innerHTML = ''; // Clear existing processes
            generatedProcesses.forEach(p => {
                createProcessInput(p.pid, p.arrivalTime, p.burstTime, p.priority);
            });
        } catch (error) {
            console.error("Failed to generate processes:", error);
            showError("Sorry, I couldn't generate processes. Please try a different prompt.");
        } finally {
            toggleSpinner('gemini-generate', false);
        }
    });

    // --- Gemini Feature: Analyze & Explain Results ---
    geminiAnalyzeBtn.addEventListener('click', async () => {
        console.log('Gemini Analyze button clicked');
        console.log('Add Process button clicked');
        toggleSpinner('gemini-analyze', true);
        geminiAnalysisContainer.classList.add('hidden');
        errorMessageDiv.classList.add('hidden');

        const selectedAlgorithm = algorithmSelect.options[algorithmSelect.selectedIndex].text;
        const inputProcesses = finalProcessesState.map(p => ({
            pid: p.pid,
            arrivalTime: p.arrivalTime,
            burstTime: p.burstTime,
            ...(p.priority ? { priority: p.priority } : {})
        }));

        const resultsSummary = {
            avgWaitingTime: document.getElementById('avg-waiting-time').textContent,
            avgTurnaroundTime: document.getElementById('avg-turnaround-time').textContent,
            cpuUtilization: document.getElementById('cpu-utilization').textContent,
            throughput: document.getElementById('throughput').textContent
        };

        const prompt = `
                    You are an expert operating systems tutor. Analyze the following CPU scheduling scenario and provide a clear, concise explanation in Markdown format.

                    **Algorithm:** ${selectedAlgorithm}
                    **Input Processes:** ${JSON.stringify(inputProcesses, null, 2)}
                    **Results:** ${JSON.stringify(resultsSummary, null, 2)}

                    Please explain the following:
                    1.  **Execution Analysis:** Briefly explain why the schedule produced these results. How did the algorithm handle this specific set of processes?
                    2.  **Algorithm Performance:** Discuss the pros and cons of using this algorithm for this particular workload. Was it a good choice?
                    3.  **Alternative Suggestion:** Suggest one other algorithm that might be better suited for this workload and explain why.
                `;

        const payload = { contents: [{ parts: [{ text: prompt }] }] };

        try {
            const explanation = await callGemini(payload);
            // Basic Markdown to HTML conversion
            let htmlExplanation = explanation
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');
            geminiAnalysisContainer.innerHTML = htmlExplanation;
            geminiAnalysisContainer.classList.remove('hidden');
        } catch (error) {
            console.error("Failed to analyze results:", error);
            showError("Sorry, I couldn't analyze the results at this time.");
        } finally {
            toggleSpinner('gemini-analyze', false);
        }
    });

    function toggleSpinner(button, show) {
        const btnText = document.getElementById(`${button}-text`);
        const spinner = document.getElementById(`${button}-spinner`);
        if (show) {
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');
            document.getElementById(`${button}-btn`).disabled = true;
        } else {
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
            document.getElementById(`${button}-btn`).disabled = false;
        }
    }


    // --- UI Update & Process Management ---
    function updateUIForAlgorithm() { /* ... unchanged ... */ }
    function reindexProcesses() { /* ... unchanged ... */ }
    function createProcessInput(pid = '', arrival = '', burst = '', priority = '', insertAfterElement = null) { /* ... unchanged ... */ }

    // --- Event Listeners ---
    algorithmSelect.addEventListener('change', () => {
        updateUIForAlgorithm();
        // Also update all visible process rows for priority column
        document.querySelectorAll('.process-input-row').forEach(row => {
            const priorityContainer = row.querySelector('.process-priority-container');
            const selectedAlgorithm = algorithmSelect.value;
            const isPriority = selectedAlgorithm === 'priority-np' || selectedAlgorithm === 'priority-p';
            priorityContainer.classList.toggle('hidden', !isPriority);
            const columns = isPriority ? 'auto 1fr 1fr 1fr auto' : 'auto 1fr 1fr auto';
            row.style.gridTemplateColumns = columns;
        });
    });
    addProcessBtn.addEventListener('click', () => createProcessInput(`P${processCount}`));
    processInputsContainer.addEventListener('click', function (e) { /* ... unchanged ... */ });

    calculateBtn.addEventListener('click', () => {
        console.log('Calculate & Visualize button clicked');
        geminiAnalysisContainer.classList.add('hidden'); // Hide old analysis on new calculation
        /* ... rest of the calculation logic is unchanged ... */
        resultsSection.classList.add('hidden');
        errorMessageDiv.classList.add('hidden');
        let processes = [];
        let hasError = false;
        const inputRows = document.querySelectorAll('.process-input-row');
        inputRows.forEach((row, i) => {
            const pid = row.querySelector('.process-pid').value.trim() || `P${i}`;
            const arrival = row.querySelector('.process-arrival').value.trim();
            const burst = row.querySelector('.process-burst').value.trim();
            const priority = row.querySelector('.process-priority').value.trim();
            const selectedAlgorithm = algorithmSelect.value;
            const isPriority = selectedAlgorithm === 'priority-np' || selectedAlgorithm === 'priority-p';
            if (arrival === '' || burst === '' || (isPriority && priority === '')) { showError('All visible input fields must be filled.'); hasError = true; }
            const arrivalNum = parseFloat(arrival), burstNum = parseFloat(burst), priorityNum = parseInt(priority || '0');
            if (isNaN(arrivalNum) || isNaN(burstNum) || (isPriority && isNaN(priorityNum))) { showError('Please enter valid numbers for all fields.'); hasError = true; }
            if (arrivalNum < 0 || burstNum <= 0 || (isPriority && priorityNum < 0)) { showError('Arrival/Priority must be non-negative. Burst must be positive.'); hasError = true; }
            processes.push({ pid: pid, originalIndex: i, arrivalTime: arrivalNum, burstTime: burstNum, priority: priorityNum });
        });
        if (hasError) return;
        const selectedAlgorithm = algorithmSelect.value;
        const isRR = selectedAlgorithm === 'rr';
        const timeQuantum = isRR ? parseFloat(timeQuantumInput.value) : 0;
        if (isRR && (isNaN(timeQuantum) || timeQuantum <= 0)) { showError('Time Quantum must be a positive number.'); hasError = true; }
        if (processes.length === 0) { showError('Please add at least one process.'); hasError = true; }
        if (hasError) return;
        let result;
        switch (selectedAlgorithm) {
            case 'fcfs': result = calculateFCFS(processes); break;
            case 'sjf-np': result = calculateSJF_NP(processes); break;
            case 'srtf': result = calculateSRTF(processes); break;
            case 'rr': result = calculateRR(processes, timeQuantum); break;
            case 'priority-np': result = calculatePriority_NP(processes); break;
            case 'priority-p': result = calculatePriority_P(processes); break;
        }
        finalProcessesState = result.processes;
        displayResults(result.processes, result.totalBurstTime, result.totalTime, result.ganttData, result.history);
        // Smooth scroll to Final Results Summary section
        setTimeout(() => {
            const resultsSection = document.getElementById('results-section');
            if (resultsSection) {
                resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    });

    function showError(message) { /* ... unchanged ... */ }
    // --- All Calculation Functions (calculateFCFS, etc.) remain unchanged ---
    function commonPreemptiveLoop(processes, getNextProcess) { /* ... */ }
    function calculateFCFS(processes) { /* ... */ }
    function calculateSJF_NP(processes) { /* ... */ }
    function calculateSRTF(processes) { /* ... */ }
    function calculateRR(processes, timeQuantum) { /* ... */ }
    function calculatePriority_NP(processes) { /* ... */ }
    function calculatePriority_P(processes) { /* ... */ }

    // --- Display & Sort Functions ---
    function redrawTable() { /* ... unchanged ... */ }
    function sortProcesses(column) { /* ... unchanged ... */ }
    function displayResults(processes, totalBurstTime, totalTime, ganttData, history) { /* ... unchanged ... */ }

    // --- Initial Setup ---
    const initialProcesses = [
        { pid: 'P0', arrival: 0, burst: 5, priority: 2 },
        { pid: 'P1', arrival: 1, burst: 3, priority: 1 },
        { pid: 'P2', arrival: 2, burst: 4, priority: 3 },
        { pid: 'P3', arrival: 3, burst: 2, priority: 4 }
    ];
    initialProcesses.forEach((p) => createProcessInput(p.pid, p.arrival, p.burst, p.priority));

    // Populate infoTexts object
    infoTexts.fcfs = '<span class="font-semibold">FCFS:</span> Processes are executed in the order they arrive.';
    infoTexts['sjf-np'] = '<span class="font-semibold">SJF (Non-Preemptive):</span> The waiting process with the smallest burst time is selected next.';
    infoTexts.srtf = '<span class="font-semibold">SRTF (SJF Preemptive):</span> The running process is preempted if a new process with a shorter remaining time arrives.';
    infoTexts.rr = '<span class="font-semibold">Round Robin:</span> Processes are run in a cyclic queue for a fixed time slice (Time Quantum).';
    infoTexts['priority-np'] = '<span class="font-semibold">Priority (Non-Preemptive):</span> The waiting process with the highest priority (lowest number) is selected. Tie-breaking is by arrival time.';
    infoTexts['priority-p'] = '<span class="font-semibold">Priority (Preemptive):</span> A running process is preempted if a new process with a higher priority arrives.';

    // --- Unchanged Functions Placeholder ---
    const unchangedFunctions = () => {
        updateUIForAlgorithm = function () {
            const selectedAlgorithm = algorithmSelect.value;
            infoText.innerHTML = infoTexts[selectedAlgorithm];
            timeQuantumContainer.classList.toggle('hidden', selectedAlgorithm !== 'rr');
            const isPriority = selectedAlgorithm === 'priority-np' || selectedAlgorithm === 'priority-p';
            document.querySelectorAll('.process-input-row').forEach(row => {
                const priorityContainer = row.querySelector('.process-priority-container');
                priorityContainer.classList.toggle('hidden', !isPriority);
                const columns = isPriority ? 'auto 1fr 1fr 1fr auto' : 'auto 1fr 1fr auto';
                row.style.gridTemplateColumns = columns;
            });
        };
        reindexProcesses = function () {
            const rows = document.querySelectorAll('.process-input-row');
            processCount = rows.length;
            rows.forEach((row, index) => {
                const pidInput = row.querySelector('.process-pid');
                if (pidInput.value === '' || pidInput.value.startsWith('P')) {
                    pidInput.value = `P${index}`;
                }
            });
            addProcessBtn.classList.toggle('hidden', processCount > 0);
        };
        createProcessInput = function (pid = '', arrival = '', burst = '', priority = '', insertAfterElement = null) {
            const div = document.createElement('div');
            div.className = 'process-input-row grid gap-3 items-center';
            div.innerHTML = `
                        <input type="text" placeholder="PID" value="${pid}" class="process-pid w-20 p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-semibold">
                        <input type="text" placeholder="Arrival Time (AT)" value="${arrival}" class="process-arrival w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <input type="text" placeholder="Burst Time (BT)" value="${burst}" class="process-burst w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <div class="process-priority-container hidden">
                            <input type="text" placeholder="Priority" value="${priority}" class="process-priority w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div class="flex space-x-2">
                            <button class="insert-btn bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-2 text-xs rounded-md">Insert</button>
                            <button class="delete-btn bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 text-xs rounded-md">Delete</button>
                        </div>
                    `;
            if (insertAfterElement) {
                insertAfterElement.parentNode.insertBefore(div, insertAfterElement.nextSibling);
            } else {
                processInputsContainer.appendChild(div);
            }
            reindexProcesses();
            updateUIForAlgorithm();
        };
        processInputsContainer.addEventListener('click', function (e) {
            if (e.target.classList.contains('delete-btn')) {
                console.log('Delete Process button clicked');
                e.target.closest('.process-input-row').remove();
                reindexProcesses();
            } else if (e.target.classList.contains('insert-btn')) {
                console.log('Insert Process button clicked');
                const currentRow = e.target.closest('.process-input-row');
                createProcessInput('', '', '', '', currentRow);
            }
            console.log('Gemini API call started', payload);
            console.log('Error shown:', message);
        });
        showError = function (message) {
            errorTextSpan.textContent = message;
            errorMessageDiv.classList.remove('hidden');
        };
        redrawTable = function () {
            const tableBody = document.getElementById('results-table-body');
            const selectedAlgorithm = algorithmSelect.value;
            const isPriority = selectedAlgorithm === 'priority-np' || selectedAlgorithm === 'priority-p';
            tableBody.innerHTML = '';

            finalProcessesState.forEach(p => {
                let row = `<tr class="dark:text-gray-300">
                            <td class="px-4 py-2 whitespace-nowrap">${p.pid}</td>
                            <td class="px-4 py-2 whitespace-nowrap">${p.arrivalTime}</td>
                            <td class="px-4 py-2 whitespace-nowrap">${p.burstTime}</td>`;
                if (isPriority) row += `<td class="px-4 py-2 whitespace-nowrap">${p.priority}</td>`;
                row += `<td class="px-4 py-2 whitespace-nowrap">${p.completionTime ?? ''}</td>
                                <td class="px-4 py-2 whitespace-nowrap">${p.turnaroundTime ?? ''}</td>
                                <td class="px-4 py-2 whitespace-nowrap">${p.waitingTime ?? ''}</td></tr>`;
                tableBody.innerHTML += row;
            });
        };
        sortProcesses = function (column) {
            if (currentSortState.column === column) {
                currentSortState.direction = currentSortState.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortState.column = column;
                currentSortState.direction = 'asc';
            }
            finalProcessesState.sort((a, b) => {
                let valA = a[column]; let valB = b[column];
                if (column === 'pid') { valA = parseInt(a.pid.substring(1), 10); valB = parseInt(b.pid.substring(1), 10); }
                if (valA === undefined || valA === null) return 1; if (valB === undefined || valB === null) return -1;
                if (currentSortState.direction === 'asc') { return valA > valB ? 1 : -1; } else { return valA < valB ? 1 : -1; }
            });
            document.querySelectorAll('#results-table-header th').forEach(th => {
                th.classList.remove('sort-asc', 'sort-desc');
                if (th.dataset.column === column) { th.classList.add(currentSortState.direction === 'asc' ? 'sort-asc' : 'sort-desc'); }
            });
            redrawTable();
        };
        displayResults = function (processes, totalBurstTime, totalTime, ganttData, history) {
            const n = processes.length;
            const totalWaitingTime = processes.reduce((acc, p) => acc + (p.waitingTime ?? 0), 0);
            const totalTurnaroundTime = processes.reduce((acc, p) => acc + (p.turnaroundTime ?? 0), 0);
            document.getElementById('avg-waiting-time').textContent = n > 0 ? (totalWaitingTime / n).toFixed(2) : '0.00';
            document.getElementById('avg-turnaround-time').textContent = n > 0 ? (totalTurnaroundTime / n).toFixed(2) : '0.00';
            document.getElementById('cpu-utilization').textContent = totalTime > 0 ? ((totalBurstTime / totalTime) * 100).toFixed(2) + '%' : '0.00%';
            document.getElementById('throughput').textContent = totalTime > 0 ? (n / totalTime).toFixed(3) : '0.000';
            const tableHeader = document.getElementById('results-table-header');
            const selectedAlgorithm = algorithmSelect.value;
            const isPriority = selectedAlgorithm === 'priority-np' || selectedAlgorithm === 'priority-p';
            const columns = { 'pid': 'PID', 'arrivalTime': 'Arrival Time (AT)', 'burstTime': 'Burst Time (BT)' };
            if (isPriority) columns.priority = 'Priority';
            Object.assign(columns, { 'completionTime': 'Completion', 'turnaroundTime': 'Turnaround', 'waitingTime': 'Waiting' });
            tableHeader.innerHTML = '';
            for (const key in columns) {
                const th = document.createElement('th');
                th.className = 'sortable px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider';
                th.textContent = columns[key];
                th.dataset.column = key;
                th.onclick = () => sortProcesses(key);
                tableHeader.appendChild(th);
            }
            currentSortState = { column: null, direction: 'asc' };
            redrawTable();
            const ganttChart = document.getElementById('gantt-chart');
            const ganttLabels = document.getElementById('gantt-labels');
            ganttChart.innerHTML = ''; ganttLabels.innerHTML = '';
            if (totalTime > 0) {
                const finalGantt = [];
                if (ganttData.length > 0) {
                    finalGantt.push({ ...ganttData[0] });
                    for (let i = 1; i < ganttData.length; i++) {
                        const last = finalGantt[finalGantt.length - 1];
                        if (ganttData[i].pid === last.pid && ganttData[i].start === last.start + last.duration) last.duration += ganttData[i].duration;
                        else finalGantt.push({ ...ganttData[i] });
                    }
                }
                const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#D946EF'];
                finalGantt.forEach(item => {
                    const block = document.createElement('div');
                    block.className = 'gantt-block h-12';
                    block.style.width = `${(item.duration / totalTime) * 100}%`;
                    block.textContent = item.pid;
                    block.style.backgroundColor = item.pid === 'Idle' ? '#9CA3AF' : colors[processes.find(p => p.pid === item.pid)?.originalIndex % colors.length || 0];
                    ganttChart.appendChild(block);
                });
                let accumulatedWidth = 0;
                const startLabel = document.createElement('div');
                startLabel.className = 'time-label'; startLabel.textContent = finalGantt[0]?.start ?? 0; startLabel.style.left = '0%';
                ganttLabels.appendChild(startLabel);
                finalGantt.forEach(item => {
                    accumulatedWidth += (item.duration / totalTime) * 100;
                    const label = document.createElement('div');
                    label.className = 'time-label'; label.textContent = item.start + item.duration; label.style.left = `${accumulatedWidth}%`;
                    ganttLabels.appendChild(label);
                });
            }
            stepByStepContainer.innerHTML = '';
            history.forEach(step => {
                const card = document.createElement('div');
                card.className = 'step-card bg-white dark:bg-gray-700 p-3 rounded-md shadow-sm border dark:border-gray-600 flex-shrink-0';
                card.innerHTML = `<div class="text-sm font-bold text-gray-800 dark:text-gray-100 mb-2">Time: ${step.time}</div><div class="mb-2"><span class="text-xs font-semibold text-gray-500 dark:text-gray-400">EVENT</span><p class="text-xs text-blue-700 dark:text-blue-400 font-medium">${step.event}</p></div><div class="mb-2"><span class="text-xs font-semibold text-gray-500 dark:text-gray-400">CPU</span><div class="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 text-center rounded-sm px-2 py-1 text-sm font-bold">${step.cpuProcess}</div></div><div><span class="text-xs font-semibold text-gray-500 dark:text-gray-400">READY QUEUE</span><div class="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 rounded-sm px-2 py-1 text-sm h-8 flex items-center justify-center font-mono">${step.readyQueue.join(', ') || '[Empty]'}</div></div>`;
                stepByStepContainer.appendChild(card);
            });
            resultsSection.classList.remove('hidden');
        };
        commonPreemptiveLoop = function (processes, getNextProcess) { let currentTime = 0, completed = 0, totalBurstTime = 0; const n = processes.length; const ganttData = []; const history = []; processes.forEach(p => { p.remainingTime = p.burstTime; totalBurstTime += p.burstTime; p.isCompleted = false; }); while (completed < n) { const arrivedProcesses = processes.filter(p => p.arrivalTime <= currentTime && !p.isCompleted); const nextProcess = getNextProcess(processes, currentTime); if (!nextProcess) { const readyQueue = arrivedProcesses.map(p => p.pid).sort(); history.push({ time: currentTime, cpuProcess: 'Idle', readyQueue, event: 'CPU Idle' }); const nextArrivalTime = Math.min(...processes.filter(p => !p.isCompleted).map(p => p.arrivalTime)); const idleDuration = nextArrivalTime - currentTime; ganttData.push({ pid: 'Idle', start: currentTime, duration: idleDuration }); currentTime = nextArrivalTime; continue; } const readyQueue = arrivedProcesses.filter(p => p.pid !== nextProcess.pid).map(p => p.pid).sort(); const event = `${nextProcess.pid} is selected`; history.push({ time: currentTime, cpuProcess: nextProcess.pid, readyQueue, event }); const lastGantt = ganttData.length > 0 ? ganttData[ganttData.length - 1] : null; if (lastGantt && lastGantt.pid === nextProcess.pid && lastGantt.start + lastGantt.duration === currentTime) { lastGantt.duration++; } else { ganttData.push({ pid: nextProcess.pid, start: currentTime, duration: 1 }); } nextProcess.remainingTime--; currentTime++; if (nextProcess.remainingTime === 0) { nextProcess.completionTime = currentTime; nextProcess.turnaroundTime = nextProcess.completionTime - nextProcess.arrivalTime; nextProcess.waitingTime = nextProcess.turnaroundTime - nextProcess.burstTime; nextProcess.isCompleted = true; completed++; history[history.length - 1].event += ` & completes.`; } } return { processes, totalBurstTime, totalTime: currentTime, ganttData, history }; };
        calculateFCFS = function (processes) { processes.sort((a, b) => a.arrivalTime - b.arrivalTime); let currentTime = 0; let totalBurstTime = 0; const ganttData = []; const history = []; processes.forEach((p, index) => { totalBurstTime += p.burstTime; if (currentTime < p.arrivalTime) { const idleDuration = p.arrivalTime - currentTime; ganttData.push({ pid: 'Idle', start: currentTime, duration: idleDuration }); history.push({ time: currentTime, cpuProcess: 'Idle', readyQueue: [], event: `CPU idle until next arrival at t=${p.arrivalTime}` }); currentTime = p.arrivalTime; } const readyQueue = processes.slice(index + 1).filter(proc => proc.arrivalTime <= currentTime).map(proc => proc.pid); history.push({ time: currentTime, cpuProcess: p.pid, readyQueue: readyQueue, event: `${p.pid} starts execution.` }); p.startTime = currentTime; p.completionTime = currentTime + p.burstTime; p.turnaroundTime = p.completionTime - p.arrivalTime; p.waitingTime = p.startTime - p.arrivalTime; ganttData.push({ pid: p.pid, start: currentTime, duration: p.burstTime }); currentTime = p.completionTime; history.push({ time: currentTime, cpuProcess: '-', readyQueue: [], event: `${p.pid} completes.` }); }); return { processes, totalBurstTime, totalTime: currentTime, ganttData, history }; };
        calculateSJF_NP = function (processes) { let currentTime = 0, completed = 0, totalBurstTime = 0; const n = processes.length; const ganttData = [], history = []; processes.forEach(p => { p.isCompleted = false; totalBurstTime += p.burstTime; }); while (completed < n) { const available = processes.filter(p => p.arrivalTime <= currentTime && !p.isCompleted); const readyQueue = available.map(p => p.pid).sort(); if (available.length === 0) { const nextArrival = Math.min(...processes.filter(p => !p.isCompleted).map(p => p.arrivalTime)); history.push({ time: currentTime, cpuProcess: 'Idle', readyQueue: [], event: `CPU idle until t=${nextArrival}` }); ganttData.push({ pid: 'Idle', start: currentTime, duration: nextArrival - currentTime }); currentTime = nextArrival; continue; } available.sort((a, b) => a.burstTime - b.burstTime); const processToRun = available[0]; history.push({ time: currentTime, cpuProcess: processToRun.pid, readyQueue: readyQueue.filter(p => p.pid !== processToRun.pid), event: `${processToRun.pid} starts (shortest burst).` }); processToRun.completionTime = currentTime + processToRun.burstTime; ganttData.push({ pid: processToRun.pid, start: currentTime, duration: processToRun.burstTime }); currentTime = processToRun.completionTime; processToRun.turnaroundTime = processToRun.completionTime - processToRun.arrivalTime; processToRun.waitingTime = processToRun.turnaroundTime - processToRun.burstTime; processToRun.isCompleted = true; completed++; history.push({ time: currentTime, cpuProcess: '-', readyQueue: [], event: `${processToRun.pid} completes.` }); } return { processes, totalBurstTime, totalTime: currentTime, ganttData, history }; };
        calculateSRTF = function (processes) { return commonPreemptiveLoop(processes, (procs, time) => { const available = procs.filter(p => p.arrivalTime <= time && !p.isCompleted); if (available.length === 0) return null; available.sort((a, b) => a.remainingTime - b.remainingTime); return available[0]; }); };
        calculateRR = function (processes, timeQuantum) { let currentTime = 0, completed = 0, totalBurstTime = 0; const n = processes.length; const ganttData = [], history = []; const queue = []; let sortedByArrival = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime); let arrivalIndex = 0; processes.forEach(p => { p.remainingTime = p.burstTime; totalBurstTime += p.burstTime; }); while (completed < n) { while (arrivalIndex < n && sortedByArrival[arrivalIndex].arrivalTime <= currentTime) { queue.push(sortedByArrival[arrivalIndex]); history.push({ time: sortedByArrival[arrivalIndex].arrivalTime, cpuProcess: '-', readyQueue: queue.map(p => p.pid), event: `${sortedByArrival[arrivalIndex].pid} arrives.` }); arrivalIndex++; } if (queue.length === 0) { if (arrivalIndex < n) { const idleUntil = sortedByArrival[arrivalIndex].arrivalTime; ganttData.push({ pid: 'Idle', start: currentTime, duration: idleUntil - currentTime }); history.push({ time: currentTime, cpuProcess: 'Idle', readyQueue: [], event: `CPU idle until t=${idleUntil}.` }); currentTime = idleUntil; } else break; continue; } const processToRun = queue.shift(); const execTime = Math.min(timeQuantum, processToRun.remainingTime); history.push({ time: currentTime, cpuProcess: processToRun.pid, readyQueue: queue.map(p => p.pid), event: `${processToRun.pid} runs for ${execTime} unit(s).` }); ganttData.push({ pid: processToRun.pid, start: currentTime, duration: execTime }); currentTime += execTime; processToRun.remainingTime -= execTime; while (arrivalIndex < n && sortedByArrival[arrivalIndex].arrivalTime <= currentTime) { queue.push(sortedByArrival[arrivalIndex]); history.push({ time: sortedByArrival[arrivalIndex].arrivalTime, cpuProcess: processToRun.pid, readyQueue: queue.map(p => p.pid), event: `${sortedByArrival[arrivalIndex].pid} arrives.` }); arrivalIndex++; } if (processToRun.remainingTime > 0) { queue.push(processToRun); } else { processToRun.completionTime = currentTime; processToRun.turnaroundTime = processToRun.completionTime - processToRun.arrivalTime; processToRun.waitingTime = processToRun.turnaroundTime - processToRun.burstTime; completed++; history[history.length - 1].event += ` ${processToRun.pid} completes.`; } } return { processes, totalBurstTime, totalTime: currentTime, ganttData, history }; };
        calculatePriority_NP = function (processes) { let currentTime = 0, completed = 0, totalBurstTime = 0; const n = processes.length; const ganttData = [], history = []; processes.forEach(p => { p.isCompleted = false; totalBurstTime += p.burstTime; }); while (completed < n) { const available = processes.filter(p => p.arrivalTime <= currentTime && !p.isCompleted); const readyQueue = available.map(p => p.pid).sort(); if (available.length === 0) { const nextArrival = Math.min(...processes.filter(p => !p.isCompleted).map(p => p.arrivalTime)); history.push({ time: currentTime, cpuProcess: 'Idle', readyQueue: [], event: `CPU idle until t=${nextArrival}` }); ganttData.push({ pid: 'Idle', start: currentTime, duration: nextArrival - currentTime }); currentTime = nextArrival; continue; } available.sort((a, b) => a.priority !== b.priority ? a.priority - b.priority : a.arrivalTime - b.arrivalTime); const processToRun = available[0]; history.push({ time: currentTime, cpuProcess: processToRun.pid, readyQueue: readyQueue.filter(p => p.pid !== processToRun.pid), event: `${processToRun.pid} starts (highest priority).` }); processToRun.completionTime = currentTime + processToRun.burstTime; ganttData.push({ pid: processToRun.pid, start: currentTime, duration: processToRun.burstTime }); currentTime = processToRun.completionTime; processToRun.turnaroundTime = processToRun.completionTime - processToRun.arrivalTime; processToRun.waitingTime = processToRun.turnaroundTime - processToRun.burstTime; processToRun.isCompleted = true; completed++; history.push({ time: currentTime, cpuProcess: '-', readyQueue: [], event: `${processToRun.pid} completes.` }); } return { processes, totalBurstTime, totalTime: currentTime, ganttData, history }; };
        calculatePriority_P = function (processes) { return commonPreemptiveLoop(processes, (procs, time) => { const available = procs.filter(p => p.arrivalTime <= time && !p.isCompleted); if (available.length === 0) return null; available.sort((a, b) => a.priority !== b.priority ? a.priority - b.priority : a.arrivalTime - b.arrivalTime); return available[0]; }); };
    };
    unchangedFunctions();
    initialProcesses.forEach((p) => createProcessInput(p.pid, p.arrival, p.burst, p.priority));
});
