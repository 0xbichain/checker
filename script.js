// API Configuration
const API_BASE_URL = 'https://api.binderbyte.com/v1/track';

// DOM Elements
const settingsModal = document.getElementById('settingsModal');
const openSettingsBtn = document.getElementById('openSettings');
const closeModalBtn = document.querySelector('.close');
const saveTokenBtn = document.getElementById('saveToken');
const clearTokenBtn = document.getElementById('clearToken');
const apiTokenInput = document.getElementById('apiToken');
const tokenStatus = document.getElementById('tokenStatus');
const trackingForm = document.getElementById('trackingForm');
const awbInput = document.getElementById('awb');
const courierSelect = document.getElementById('courier');
const trackButton = document.getElementById('trackButton');
const buttonText = document.getElementById('buttonText');
const buttonLoader = document.getElementById('buttonLoader');
const resultsDiv = document.getElementById('results');
const resultContent = document.getElementById('resultContent');
const closeResultsBtn = document.getElementById('closeResults');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistory');

// Storage Keys
const STORAGE_TOKEN_KEY = 'binderbyte_api_token';
const STORAGE_HISTORY_KEY = 'tracking_history';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadToken();
    loadHistory();
    setupEventListeners();
    checkTokenStatus();
});

// Event Listeners
function setupEventListeners() {
    // Modal
    openSettingsBtn.addEventListener('click', () => {
        openModal();
    });

    closeModalBtn.addEventListener('click', () => {
        closeModal();
    });

    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            closeModal();
        }
    });

    // Token Management
    saveTokenBtn.addEventListener('click', () => {
        saveToken();
    });

    clearTokenBtn.addEventListener('click', () => {
        clearToken();
    });

    // Tracking Form
    trackingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        trackPackage();
    });

    // Submit dengan Enter (sudah di handle oleh form submit)
    awbInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !trackButton.disabled) {
            trackingForm.dispatchEvent(new Event('submit'));
        }
    });

    // Close Results
    closeResultsBtn.addEventListener('click', () => {
        resultsDiv.classList.add('hidden');
    });

    // Clear History
    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('Yakin ingin menghapus semua riwayat?')) {
            clearAllHistory();
        }
    });
}

// Token Management
function loadToken() {
    const token = localStorage.getItem(STORAGE_TOKEN_KEY);
    if (token) {
        apiTokenInput.value = token;
    }
}

function saveToken() {
    const token = apiTokenInput.value.trim();
    if (!token) {
        alert('Token tidak boleh kosong!');
        return;
    }

    localStorage.setItem(STORAGE_TOKEN_KEY, token);
    alert('Token berhasil disimpan!');
    closeModal();
    checkTokenStatus();
}

function clearToken() {
    if (confirm('Yakin ingin menghapus token?')) {
        localStorage.removeItem(STORAGE_TOKEN_KEY);
        apiTokenInput.value = '';
        alert('Token berhasil dihapus!');
        closeModal();
        checkTokenStatus();
    }
}

function getToken() {
    return localStorage.getItem(STORAGE_TOKEN_KEY);
}

function checkTokenStatus() {
    const token = getToken();
    if (!token) {
        tokenStatus.classList.remove('hidden');
    } else {
        tokenStatus.classList.add('hidden');
    }
}

// Modal Management
function openModal() {
    settingsModal.classList.add('show');
    apiTokenInput.value = getToken() || '';
}

function closeModal() {
    settingsModal.classList.remove('show');
}

// Tracking Function
async function trackPackage() {
    const token = getToken();
    if (!token) {
        alert('Silakan set API token terlebih dahulu di pengaturan!');
        openModal();
        return;
    }

    const awb = awbInput.value.trim();
    const courier = courierSelect.value;

    if (!awb) {
        alert('Nomor resi tidak boleh kosong!');
        awbInput.focus();
        return;
    }

    // Set loading state
    trackButton.disabled = true;
    buttonText.classList.add('hidden');
    buttonLoader.classList.remove('hidden');

    try {
        const url = `${API_BASE_URL}?api_key=${encodeURIComponent(token)}&courier=${courier}&awb=${encodeURIComponent(awb)}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 200 && data.data) {
            displayResults(data.data, awb, courier);
            addToHistory(awb, courier, data.data);
        } else {
            throw new Error(data.message || 'Gagal mengambil data tracking');
        }
    } catch (error) {
        alert('Error: ' + error.message);
        console.error('Tracking error:', error);
    } finally {
        // Reset loading state
        trackButton.disabled = false;
        buttonText.classList.remove('hidden');
        buttonLoader.classList.add('hidden');
    }
}

// Display Results
function displayResults(data, awb, courier) {
    const summary = data.summary || {};
    const detail = data.detail || {};
    const history = data.history || [];

    let html = '';

    // Summary Section
    html += `
        <div class="summary-box">
            <h3>Ringkasan</h3>
            <div class="summary-item">
                <span class="summary-label">Nomor Resi:</span>
                <span class="summary-value">${summary.awb || awb}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Kurir:</span>
                <span class="summary-value">${summary.courier || courier}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Status:</span>
                <span class="summary-value">${summary.status || 'Tidak diketahui'}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Tanggal:</span>
                <span class="summary-value">${summary.date || 'Tidak diketahui'}</span>
            </div>
            ${summary.service ? `
            <div class="summary-item">
                <span class="summary-label">Layanan:</span>
                <span class="summary-value">${summary.service}</span>
            </div>
            ` : ''}
        </div>
    `;

    // Detail Section
    if (detail.origin || detail.destination || detail.shipper || detail.receiver) {
        html += `
            <div class="detail-section">
                <h3>Detail Pengiriman</h3>
                <div class="detail-grid">
                    ${detail.origin ? `
                    <div class="detail-item">
                        <div class="detail-label">Asal</div>
                        <div class="detail-value">${detail.origin}</div>
                    </div>
                    ` : ''}
                    ${detail.destination ? `
                    <div class="detail-item">
                        <div class="detail-label">Tujuan</div>
                        <div class="detail-value">${detail.destination}</div>
                    </div>
                    ` : ''}
                    ${detail.shipper ? `
                    <div class="detail-item">
                        <div class="detail-label">Pengirim</div>
                        <div class="detail-value">${detail.shipper}</div>
                    </div>
                    ` : ''}
                    ${detail.receiver ? `
                    <div class="detail-item">
                        <div class="detail-label">Penerima</div>
                        <div class="detail-value">${detail.receiver}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // History Timeline
    if (history.length > 0) {
        html += `
            <div class="detail-section">
                <h3>Riwayat Pengiriman</h3>
                <div class="history-timeline">
        `;

        history.forEach((item, index) => {
            html += `
                <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                        <div class="timeline-date">${item.date || 'Tidak diketahui'}</div>
                        <div class="timeline-desc">${item.desc || ''}</div>
                        ${item.location ? `
                        <div class="timeline-location">📍 ${item.location}</div>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    }

    resultContent.innerHTML = html;
    resultsDiv.classList.remove('hidden');
    
    // Scroll to results only on mobile (when not side by side)
    if (window.innerWidth < 1024) {
        resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// History Management
function addToHistory(awb, courier, data) {
    const history = getHistory();
    
    // Remove existing entry with same AWB and courier
    const filteredHistory = history.filter(
        item => !(item.awb === awb && item.courier === courier)
    );
    
    // Add new entry at the beginning
    const newEntry = {
        awb,
        courier,
        status: data.summary?.status || 'Tidak diketahui',
        date: data.summary?.date || new Date().toLocaleString('id-ID'),
        timestamp: Date.now()
    };
    
    filteredHistory.unshift(newEntry);
    
    // Keep only last 50 entries
    const limitedHistory = filteredHistory.slice(0, 50);
    
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(limitedHistory));
    loadHistory();
}

function getHistory() {
    const history = localStorage.getItem(STORAGE_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
}

function loadHistory() {
    const history = getHistory();
    
    if (history.length === 0) {
        historyList.innerHTML = '<p class="empty-state">Belum ada riwayat pencarian</p>';
        return;
    }
    
    let html = '';
    history.forEach(item => {
        const courierName = getCourierName(item.courier);
        html += `
            <div class="history-item" data-awb="${item.awb}" data-courier="${item.courier}">
                <div class="history-item-header">
                    <span class="history-awb">${item.awb}</span>
                    <span class="history-courier">${courierName}</span>
                </div>
                <div class="history-status">
                    Status: ${item.status} | ${item.date}
                </div>
            </div>
        `;
    });
    
    historyList.innerHTML = html;
    
    // Add click event to history items
    document.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', () => {
            const awb = item.dataset.awb;
            const courier = item.dataset.courier;
            
            awbInput.value = awb;
            courierSelect.value = courier;
            
            // Trigger tracking
            trackPackage();
        });
    });
}

function clearAllHistory() {
    localStorage.removeItem(STORAGE_HISTORY_KEY);
    loadHistory();
}

function getCourierName(code) {
    const couriers = {
        'sicepat': 'SiCepat Express',
        'jne': 'JNE',
        'jnt': 'J&T Express',
        'pos': 'Pos Indonesia',
        'tiki': 'TIKI',
        'wahana': 'Wahana',
        'ninja': 'Ninja Express',
        'lion': 'Lion Parcel'
    };
    return couriers[code] || code;
}
