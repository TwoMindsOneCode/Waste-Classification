const fileInput = document.getElementById('file-input');
const folderInput = document.getElementById('folder-input');
const choosePhotoBtn = document.getElementById('choose-photo-btn');
const detectBtn = document.getElementById('detect-btn');
const chooseFolderBtn = document.getElementById('choose-folder-btn');
const startProcessingBtn = document.getElementById('start-processing-btn');
const resetBinsBtn = document.getElementById('reset-bins-btn');
const selectedPhotoElement = document.getElementById('selected-photo');
const selectedFolderElement = document.getElementById('selected-folder');
const warningMessage = document.getElementById('warning-message');
const progressContainer = document.querySelector('.progress-container');
const currentFileElement = document.getElementById('current-file');
const progressTextElement = document.getElementById('progress-text');
const processingProgress = document.getElementById('processing-progress');
const probabilitiesDisplay = document.getElementById('probabilities-display');

const bins = {
    metal: {
        element: document.getElementById('metal-bin'),
        countElement: document.querySelector('#metal-bin .bin-count'),
        fillElement: document.querySelector('#metal-bin .bin-fill'),
        lidElement: document.querySelector('#metal-bin .bin-lid'),
        trashItem: document.querySelector('#metal-bin .trash-item'),
        count: 0,
        maxCapacity: 20
    },
    glass: {
        element: document.getElementById('glass-bin'),
        countElement: document.querySelector('#glass-bin .bin-count'),
        fillElement: document.querySelector('#glass-bin .bin-fill'),
        lidElement: document.querySelector('#glass-bin .bin-lid'),
        trashItem: document.querySelector('#glass-bin .trash-item'),
        count: 0,
        maxCapacity: 20
    },
    paper: {
        element: document.getElementById('paper-bin'),
        countElement: document.querySelector('#paper-bin .bin-count'),
        fillElement: document.querySelector('#paper-bin .bin-fill'),
        lidElement: document.querySelector('#paper-bin .bin-lid'),
        trashItem: document.querySelector('#paper-bin .trash-item'),
        count: 0,
        maxCapacity: 20
    },
    plastic: {
        element: document.getElementById('plastic-bin'),
        countElement: document.querySelector('#plastic-bin .bin-count'),
        fillElement: document.querySelector('#plastic-bin .bin-fill'),
        lidElement: document.querySelector('#plastic-bin .bin-lid'),
        trashItem: document.querySelector('#plastic-bin .trash-item'),
        count: 0,
        maxCapacity: 20
    }
};

let processingQueue = [];
let isProcessing = false;
let processedItems = new Set();

document.addEventListener('DOMContentLoaded', () => {
    loadBinsData(); 
    initEventListeners();
});

function initEventListeners() {
    choosePhotoBtn.addEventListener('click', () => fileInput.click());
    chooseFolderBtn.addEventListener('click', () => folderInput.click());
    detectBtn.addEventListener('click', processSelectedImage);
    startProcessingBtn.addEventListener('click', startBatchProcessing);
    resetBinsBtn.addEventListener('click', resetAllBins);
    fileInput.addEventListener('change', handleFileSelect);
    folderInput.addEventListener('change', handleFolderSelect);
}

function saveBinsData() {
    const binsData = {
        counts: {
            metal: bins.metal.count,
            glass: bins.glass.count,
            paper: bins.paper.count,
            plastic: bins.plastic.count
        },
        processedItems: Array.from(processedItems)
    };
    localStorage.setItem('wasteBinsData', JSON.stringify(binsData));
}

function loadBinsData() {
    const savedData = localStorage.getItem('wasteBinsData');
    if (savedData) {
        const data = JSON.parse(savedData);
        
        bins.metal.count = data.counts.metal || 0;
        bins.glass.count = data.counts.glass || 0;
        bins.paper.count = data.counts.paper || 0;
        bins.plastic.count = data.counts.plastic || 0;
        
        processedItems = new Set(data.processedItems || []);
        
        updateAllBinsDisplay();
    }
}

function updateAllBinsDisplay() {
    for (const [type, bin] of Object.entries(bins)) {
        bin.countElement.textContent = bin.count;
        bin.countElement.setAttribute('aria-label', `Current count: ${bin.count}`);
        
        const fillPercentage = Math.min((bin.count / bin.maxCapacity) * 100, 100);
        bin.fillElement.style.height = `${fillPercentage}%`;
        bin.fillElement.querySelector('.fill-percentage').textContent = `${Math.round(fillPercentage)}%`;
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        selectedPhotoElement.innerHTML = `<i class="fas fa-info-circle"></i> ${file.name}`;
        warningMessage.style.display = 'none';
    }
}

function handleFolderSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        selectedFolderElement.innerHTML = `<i class="fas fa-info-circle"></i> ${files.length} files selected`;
        startProcessingBtn.disabled = false;
        
        processingQueue = files.filter(file => 
            file.type.startsWith('image/') && 
            (file.name.endsWith('.jpg') || file.name.endsWith('.png') || file.name.endsWith('.jpeg'))
        );
    }
}

async function processSelectedImage() {
    const file = fileInput.files[0];
    if (!file) {
        alert('Please select an image first');
        return;
    }

    if (processedItems.has(file.name)) {
        warningMessage.style.display = 'block';
        return;
    }

    detectBtn.disabled = true;
    detectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    try {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/classify', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }

        showProbabilities(result.probabilities);
        await animateClassification(result.classification, file.name);
        processedItems.add(file.name);
        saveBinsData(); 
        
    } catch (error) {
        console.error('Classification error:', error);
        alert('Error processing image: ' + error.message);
    } finally {
        detectBtn.disabled = false;
        detectBtn.innerHTML = '<i class="fas fa-search"></i> Classify & Process';
    }
}

async function startBatchProcessing() {
    if (isProcessing) return;
    if (processingQueue.length === 0) {
        alert('No valid images to process');
        return;
    }

    isProcessing = true;
    startProcessingBtn.disabled = true;
    startProcessingBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    progressContainer.style.display = 'block';
    
    let processedCount = 0;
    const totalFiles = processingQueue.length;
    
    for (const file of processingQueue) {
        if (processedItems.has(file.name)) {
            processedCount++;
            updateProgress(processedCount, totalFiles, file.name);
            continue;
        }
        
        currentFileElement.textContent = file.name;
        
        try {
            const formData = new FormData();
            formData.append('image', file);
            
            const response = await fetch('/classify', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error);
            }
            
            const bin = bins[result.classification];
            bin.count++;
            bin.countElement.textContent = bin.count;
            bin.countElement.setAttribute('aria-label', `Current count: ${bin.count}`);
            
            const fillPercentage = Math.min((bin.count / bin.maxCapacity) * 100, 100);
            bin.fillElement.style.height = `${fillPercentage}%`;
            bin.fillElement.querySelector('.fill-percentage').textContent = `${Math.round(fillPercentage)}%`;
            
            processedItems.add(file.name);
            saveBinsData(); 
            
        } catch (error) {
            console.error(`Error processing ${file.name}:`, error);
        } finally {
            processedCount++;
            updateProgress(processedCount, totalFiles, file.name);
        }
    }
    
    isProcessing = false;
    startProcessingBtn.disabled = false;
    startProcessingBtn.innerHTML = '<i class="fas fa-play"></i> Start Processing';
}

function updateProgress(current, total, filename) {
    const progress = (current / total) * 100;
    processingProgress.value = progress;
    progressTextElement.textContent = `${current}/${total}`;
    currentFileElement.textContent = filename || 'Processing...';
}

async function animateClassification(classification, filename) {
    const bin = bins[classification];
    const trashItem = bin.trashItem;
    
    trashItem.style.backgroundImage = `url('icons/${classification}.png')`;
    trashItem.style.display = 'block';
    bin.lidElement.classList.add('lid-open');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    trashItem.classList.add('item-fall');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    bin.count++;
    bin.countElement.textContent = bin.count;
    bin.countElement.setAttribute('aria-label', `Current count: ${bin.count}`);
    
    const fillPercentage = Math.min((bin.count / bin.maxCapacity) * 100, 100);
    bin.fillElement.style.height = `${fillPercentage}%`;
    bin.fillElement.querySelector('.fill-percentage').textContent = `${Math.round(fillPercentage)}%`;
    
    createParticles(bin.element);
    bin.lidElement.classList.remove('lid-open');
    
    await new Promise(resolve => setTimeout(resolve, 300));
    trashItem.classList.remove('item-fall');
    trashItem.style.display = 'none';
    
    bin.fillElement.classList.add('animate');
    await new Promise(resolve => setTimeout(resolve, 300));
    bin.fillElement.classList.remove('animate');
}

function createParticles(binElement) {
    const colors = {
        metal: '#FFA726',
        glass: '#4FC3F7',
        paper: '#81C784',
        plastic: '#BA68C8'
    };
    
    const binType = binElement.id.replace('-bin', '');
    const color = colors[binType];
    
    for (let i = 0; i < 15; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.backgroundColor = color;
        
        const binBody = binElement.querySelector('.bin-body');
        const rect = binBody.getBoundingClientRect();
        
        particle.style.left = `${rect.left + Math.random() * rect.width}px`;
        particle.style.top = `${rect.top + Math.random() * rect.height}px`;
        particle.style.setProperty('--tx', `${(Math.random() - 0.5) * 100}px`);
        particle.style.setProperty('--ty', `${-Math.random() * 150 - 50}px`);
        
        document.body.appendChild(particle);
        
        setTimeout(() => {
            particle.remove();
        }, 1500);
    }
}

function showProbabilities(probabilities) {
    probabilitiesDisplay.style.display = 'block';
    probabilitiesDisplay.innerHTML = '<h3>Classification Probabilities</h3>';
    
    const sorted = Object.entries(probabilities).sort((a, b) => b[1] - a[1]);
    
    sorted.forEach(([material, prob]) => {
        const probPercent = (prob * 100).toFixed(1);
        const probItem = document.createElement('div');
        probItem.className = 'probability-item';
        
        probItem.innerHTML = `
            <span class="material-name">${material.charAt(0).toUpperCase() + material.slice(1)}</span>
            <span class="material-prob">${probPercent}%</span>
            <div class="probability-bar-container">
                <div class="probability-bar" style="width: ${probPercent}%; background-color: ${
                    material === 'metal' ? 'var(--metal-color)' :
                    material === 'glass' ? 'var(--glass-color)' :
                    material === 'paper' ? 'var(--paper-color)' : 'var(--plastic-color)'
                }"></div>
            </div>
        `;
        
        probabilitiesDisplay.appendChild(probItem);
    });
    
    setTimeout(() => {
        probabilitiesDisplay.style.display = 'none';
    }, 5000);
}

function resetAllBins() {
    if (isProcessing) return;
    
    if (!confirm('Are you sure you want to empty all bins?')) return;
    
    for (const [type, bin] of Object.entries(bins)) {
        bin.count = 0;
        bin.countElement.textContent = '0';
        bin.countElement.setAttribute('aria-label', 'Current count: 0');
        bin.fillElement.style.height = '0%';
        bin.fillElement.querySelector('.fill-percentage').textContent = '0%';
    }
    
    processedItems.clear();
    localStorage.removeItem('wasteBinsData'); 
}