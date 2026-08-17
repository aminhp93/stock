// Robust Interactive Flow Engine (Zero External Dependencies)
// Supports Pan (Canvas Drag), Zoom In/Out (Wheel & Buttons), Node Drag & Drop, Double-Click to Open Detail Modal

const initialNodesData = [
    { id: '1', num: '1', title: 'Step 1: Data Collection', desc: 'Point-In-Time & PostgreSQL (464k bars)', x: 40, y: 190 },
    { id: '2a', num: '2A', title: 'Step 2A: Market Analysis', desc: 'RSI, MA20/50 & DCF Valuation', x: 320, y: 80 },
    { id: '2b', num: '2B', title: 'Step 2B: Investor Simulator', desc: '10 Personas & 10k Monte-Carlo', x: 320, y: 300 },
    { id: '3', num: '3', title: 'Step 3: Trading Strategy', desc: 'Bull/Base/Bear & Trade Plan', x: 600, y: 190 },
    { id: '4', num: '4', title: 'Step 4: Risk Manager', desc: 'Half-Kelly & Drawdown Limits', x: 870, y: 190 },
    { id: '5', num: '5', title: 'Step 5: Verifier Gatekeeper', desc: '7 Standards ➔ APPROVED', x: 1140, y: 190 }
];

const connections = [
    { from: '1', to: '2a' },
    { from: '1', to: '2b' },
    { from: '2a', to: '3' },
    { from: '2b', to: '3' },
    { from: '3', to: '4' },
    { from: '4', to: '5' }
];

// Canvas Transform State
let scale = 1.0;
let panX = 0;
let panY = 0;
let isPanning = false;
let startPanX = 0;
let startPanY = 0;

// Dragging Node State
let draggedNode = null;
let nodeOffsetX = 0;
let nodeOffsetY = 0;

const stepDetails = {
    '1': {
        title: "Step 1: Data Collection Agent (Point-In-Time)",
        content: `
            <div style="background: #fafafa; border: 1px solid #e5e5e5; padding: 16px; border-radius: 8px; line-height: 1.8;">
                <p><strong>Path:</strong> <code>/data-collection-agent</code></p>
                <p><strong>Database Kết Nối:</strong> PostgreSQL (stock_db:5432)</p>
                <p><strong>Tổng Mã Cổ Phiếu Đã Lưu:</strong> 1,403 mã (HOSE, HNX, UPCoM)</p>
                <p><strong>Tổng Nến Giá Lịch Sử:</strong> 464,975 phiên nến OHLCV</p>
                <p><strong>Khung Thời Gian Cập Nhật:</strong> 01/01/2021 ➔ 31/12/2025 (5 NĂM)</p>
            </div>
        `
    },
    '2a': {
        title: "Step 2A: Market Analysis Agent",
        content: `
            <div style="background: #fafafa; border: 1px solid #e5e5e5; padding: 16px; border-radius: 8px; line-height: 1.8;">
                <p><strong>Path:</strong> <code>/market-analysis-agent</code></p>
                <p><strong>Chỉ Số Kỹ Thuật:</strong> RSI (14 ngày), MA20, MA50</p>
                <p><strong>Định Giá Cơ Bản:</strong> Margin of Safety DCF Value</p>
                <p><strong>Phân Tích Cảm Xúc Tin Tức:</strong> Sentiment Score (-1.0 đến +1.0)</p>
            </div>
        `
    },
    '2b': {
        title: "Step 2B: 10-Investor Behavioral Simulation Engine",
        content: `
            <p style="margin-bottom: 12px;">Chi tiết quyết định của 10 Persona nhà đầu tư mô phỏng người thật:</p>
            <div class="persona-grid">
                <div class="persona-item">
                    <div class="persona-item-head"><span>F0 Tâm Lý Bầy Đàn</span><span>FOMO_BUY (85%)</span></div>
                    <div class="persona-item-reason">Tin tốt ra rầm rộ, giá bay mạnh đua lệnh ngay!</div>
                </div>
                <div class="persona-item">
                    <div class="persona-item-head"><span>Deep Value Investor</span><span>BUY (90%)</span></div>
                    <div class="persona-item-reason">Định giá DCF chiết khấu > 15%. Gom hàng tích trữ.</div>
                </div>
                <div class="persona-item">
                    <div class="persona-item-head"><span>Swing Trader</span><span>BUY (80%)</span></div>
                    <div class="persona-item-reason">Giá trên MA20 và RSI (61.3) còn dư địa tăng.</div>
                </div>
                <div class="persona-item">
                    <div class="persona-item-head"><span>Loss-Averse Panic Seller</span><span>HOLD (40%)</span></div>
                    <div class="persona-item-reason">Thị trường tạm yên ổn, giữ nhưng sẵn sàng cắt lỗ.</div>
                </div>
                <div class="persona-item">
                    <div class="persona-item-head"><span>Quant Algo Fund</span><span>BUY (73%)</span></div>
                    <div class="persona-item-reason">Mô hình định lượng thuật toán báo tín hiệu MUA.</div>
                </div>
                <div class="persona-item">
                    <div class="persona-item-head"><span>Dividend Growth</span><span>BUY (72%)</span></div>
                    <div class="persona-item-reason">Doanh nghiệp cổ tức cao, dòng tiền ổn định.</div>
                </div>
            </div>
        `
    },
    '3': {
        title: "Step 3: Strategy & Trading Scenario Agent",
        content: `
            <div style="background: #fafafa; border: 1px solid #e5e5e5; padding: 16px; border-radius: 8px; line-height: 1.8;">
                <p><strong>Path:</strong> <code>/strategy-agent</code></p>
                <p><strong>Bull Case (35%):</strong> Target 168,750 VND</p>
                <p><strong>Base Case (50%):</strong> Target 155,250 VND</p>
                <p><strong>Bear Case (15%):</strong> Stop Loss 128,250 VND</p>
            </div>
        `
    },
    '4': {
        title: "Step 4: Risk Manager Agent",
        content: `
            <div style="background: #fafafa; border: 1px solid #e5e5e5; padding: 16px; border-radius: 8px; line-height: 1.8;">
                <p><strong>Path:</strong> <code>/risk-management-agent</code></p>
                <p><strong>Tỷ Lệ Risk/Reward (RRR):</strong> 1:3.00 (Đạt tiêu chuẩn >= 1:2.5)</p>
                <p><strong>Vị Thế Kelly Tối Ưu:</strong> 23.3% tài khoản</p>
                <p><strong>Tỷ Trọng Giải Ngân:</strong> 15.0% tài khoản</p>
            </div>
        `
    },
    '5': {
        title: "Step 5: Investment Verifier Gatekeeper",
        content: `
            <div style="padding: 16px; border: 2px solid #000; border-radius: 8px; background: #fafafa; margin-bottom: 12px;">
                <h3 style="font-size: 1.1rem; font-weight: 800;">✅ APPROVED (ĐÃ PHÊ DUYỆT 100/100)</h3>
                <p style="font-size: 0.85rem; color: var(--text-muted);">Đạt 6/6 tiêu chí kỷ luật đầu tư. Đủ điều kiện giải ngân.</p>
            </div>
        `
    }
};

function renderNodesAndConnections() {
    const layer = document.getElementById('flow-nodes-layer');
    const svg = document.getElementById('svg-connections');
    
    if (!layer || !svg) return;

    // Apply Pan and Zoom Transform
    layer.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;

    // Clear existing nodes if first render
    if (layer.children.length === 0) {
        initialNodesData.forEach(n => {
            const el = document.createElement('div');
            el.className = 'flow-node-item';
            el.id = `node-${n.id}`;
            el.style.left = `${n.x}px`;
            el.style.top = `${n.y}px`;
            el.title = "Double-click để xem chi tiết";
            el.innerHTML = `
                <div class="node-head">
                    <div class="node-num-tag">${n.num}</div>
                    <div class="node-label-title">${n.title}</div>
                </div>
                <div class="node-desc-text">${n.desc}</div>
            `;

            // Double Click Event -> Open Detail Popup Modal
            el.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                openDetail(n.id);
            });

            // Single Click / Mouse Down -> Drag Node Only
            el.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                draggedNode = n;
                nodeOffsetX = e.clientX - n.x * scale - panX;
                nodeOffsetY = e.clientY - n.y * scale - panY;
            });

            layer.appendChild(el);
        });
    } else {
        // Update positions
        initialNodesData.forEach(n => {
            const el = document.getElementById(`node-${n.id}`);
            if (el) {
                el.style.left = `${n.x}px`;
                el.style.top = `${n.y}px`;
            }
        });
    }

    // Render SVG Connections Layer
    let pathsHTML = '';
    connections.forEach(c => {
        const fromNode = initialNodesData.find(n => n.id === c.from);
        const toNode = initialNodesData.find(n => n.id === c.to);
        
        if (fromNode && toNode) {
            const x1 = (fromNode.x + 220) * scale + panX;
            const y1 = (fromNode.y + 40) * scale + panY;
            const x2 = toNode.x * scale + panX;
            const y2 = (toNode.y + 40) * scale + panY;
            
            const dx = (x2 - x1) / 2;
            const pathData = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
            pathsHTML += `<path d="${pathData}" fill="none" stroke="#000000" stroke-width="2" stroke-dasharray="4 2" />`;
        }
    });
    
    svg.innerHTML = pathsHTML;
}

// Canvas Drag / Pan Control
const wrapper = document.getElementById('flow-canvas-wrapper');

if (wrapper) {
    wrapper.addEventListener('mousedown', (e) => {
        if (e.target === wrapper || e.target.id === 'svg-connections') {
            isPanning = true;
            startPanX = e.clientX - panX;
            startPanY = e.clientY - panY;
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (draggedNode) {
            draggedNode.x = (e.clientX - nodeOffsetX - panX) / scale;
            draggedNode.y = (e.clientY - nodeOffsetY - panY) / scale;
            renderNodesAndConnections();
        } else if (isPanning) {
            panX = e.clientX - startPanX;
            panY = e.clientY - startPanY;
            renderNodesAndConnections();
        }
    });

    window.addEventListener('mouseup', () => {
        isPanning = false;
        draggedNode = null;
    });

    // Mouse Wheel Zoom
    wrapper.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
        scale = Math.min(Math.max(0.4, scale * zoomFactor), 2.5);
        renderNodesAndConnections();
    }, { passive: false });
}

// Zoom Buttons
function zoomIn() {
    scale = Math.min(2.5, scale * 1.2);
    renderNodesAndConnections();
}

function zoomOut() {
    scale = Math.max(0.4, scale * 0.8);
    renderNodesAndConnections();
}

function resetZoom() {
    scale = 1.0;
    panX = 0;
    panY = 0;
    renderNodesAndConnections();
}

// Modal View
function openDetail(id) {
    const modal = document.getElementById("detail-modal");
    const title = document.getElementById("modal-title");
    const body = document.getElementById("modal-body");

    const data = stepDetails[id];
    if (data) {
        title.innerText = data.title;
        body.innerHTML = data.content;
        modal.style.display = "flex";
    }
}

function closeModal() {
    document.getElementById("detail-modal").style.display = "none";
}

document.getElementById("detail-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "detail-modal") {
        closeModal();
    }
});

// Initial Render
document.addEventListener('DOMContentLoaded', () => {
    renderNodesAndConnections();
});
