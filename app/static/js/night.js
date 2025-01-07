const ROLE_ACTIONS = {
    tientri: {
        actions: ['Tiên tri'],
        defaultAction: 'Tiên tri',
        needsTarget: true,
        maxCount: 1,
        uniqueRole: true
    },
    soiquy: {
        actions: ['Cắn', 'Biến thành sói'],
        defaultAction: 'Cắn',
        needsTarget: true,
        maxCount: 1,
        uniqueRole: true,
        wolfGroup: true,
        transformTarget: true
    },
    soitientri: {
        actions: ['Cắn', 'Tiên tri'],
        defaultAction: 'Cắn',
        needsTarget: true,
        maxCount: 1,
        uniqueRole: true,
        wolfGroup: true
    },
    masoi: {
        actions: ['Cắn'],
        defaultAction: 'Cắn',
        needsTarget: true,
        maxCount: 2,
        wolfGroup: true
    },
    baove: {
        actions: ['Bảo vệ'],
        defaultAction: 'Bảo vệ',
        needsTarget: true,
        maxCount: 1,
        uniqueRole: true
    },
    phuthuy: {
        actions: ['Dùng bình cứu', 'Dùng bình độc', 'Dùng cả 2', 'Không dùng bình nào'],
        defaultAction: 'Không dùng bình nào',
        needsTarget: true,
        maxCount: 1,
        doubleTargetActions: ['Dùng cả 2'],
        noTargetActions: ['Không dùng bình nào']
    },
    thosan: {
        actions: ['Kéo theo', 'Không kéo'],
        defaultAction: 'Không kéo',
        needsTarget: true,
        maxCount: 1,
        noTargetActions: ['Không kéo']
    },
    thantinhyeu: {
        actions: ['Ghép đôi'],
        defaultAction: 'Ghép đôi',
        needsTarget: true,
        maxCount: 1,
        alwaysDoubleTarget: true
    },
    danlang: {
        actions: ['Không có'],
        defaultAction: 'Không có',
        needsTarget: false,
        maxCount: 5,
        disabled: true
    },
    thienthan: {
        actions: ['Không có'],
        defaultAction: 'Không có',
        needsTarget: false,
        maxCount: 1,
        disabled: true
    }
};

let wolfTargets = {
    target: null,
    wolves: new Set()
};

document.addEventListener('DOMContentLoaded', () => {
    initializeNightPhase();
    updatePhaseDisplay();
});

async function initializeNightPhase() {
    const gameId = sessionStorage.getItem('currentGameId');
    if (!gameId) {
        showError('Không tìm thấy game ID');
        return;
    }

    try {
        const phaseResponse = await fetch(`/api/game/${gameId}/phase`);
        const phaseData = await phaseResponse.json();
        let currentPhase = phaseData.current_phase;

        if (!currentPhase) {
            currentPhase = 'NIGHT1';
            await fetch(`/api/game/${gameId}/set_phase`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phase: currentPhase })
            });
        }

        const playersResponse = await fetch(`/api/game/${gameId}/day_status`);
        if (!playersResponse.ok) {
            throw new Error(`HTTP error! status: ${playersResponse.status}`);
        }
        const players = await playersResponse.json();

        localStorage.setItem('players', JSON.stringify(players.map(player => player.name)));

        const previousNightData = JSON.parse(localStorage.getItem('nightActions') || '{}');

        const tbody = document.getElementById('player-table');
        tbody.innerHTML = '';
        if (!document.getElementById('table-header')) {
            const thead = document.createElement('thead');
            thead.id = 'table-header';
            thead.innerHTML = `
            <tr>
            <th>Tên</th>
            <th>Vai trò</th>
            <th>Hành động</th>
            <th>Đối tượng</th>
            <th>Trạng thái</th>
            <th>Kết quả</th>
            </tr>
        `;
            tbody.parentElement.insertBefore(thead, tbody);
        }
        players.forEach(player => {
            const savedAction = previousNightData[player.name] || {};
            const isDead = player.status === 'DEAD';
            const isCupid = player.role === 'thantinhyeu';

            const targetOptions = players
                .filter(p => p.status !== 'DEAD' && p.name !== player.name)
                .map(p => `<option value="${p.name}" ${p.name === savedAction.target ? 'selected' : ''}>${p.name}</option>`)
                .join('');

            const target2Options = players
                .filter(p => p.status !== 'DEAD' && p.name !== player.name)
                .map(p => `<option value="${p.name}" ${p.name === savedAction.target2 ? 'selected' : ''}>${p.name}</option>`)
                .join('');

            const isDisabled = isDead || (isCupid && currentPhase !== 'NIGHT1') || player.role === 'danlang' || player.role === 'thienthan';

            const roleOptions = currentPhase === 'NIGHT1'
                ? document.getElementById('role-options').innerHTML
                : `<option value="${player.role}">${player.role || ''}</option>`;
            let victoryStatus = '';
            const totalPlayers = players.filter(p => p.status !== 'DEAD').length;
            const totalWolves = players.filter(p => p.status !== 'DEAD' && ROLE_ACTIONS[p.role]?.wolfGroup).length;

            if (player.role === 'thienthan' && player.status === 'DEAD') {
                victoryStatus = 'Thiên Thần thắng';
            } else if (ROLE_ACTIONS[player.role]?.wolfGroup && totalWolves >= totalPlayers / 2) {
                victoryStatus = 'Sói thắng';
            } else if (totalWolves === 0 && totalPlayers > 0&& currentPhase !== 'NIGHT1') { 
                victoryStatus = 'Dân làng thắng';
            }
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${player.name}</td>
                <td>
                    <select class="role-select" onchange="updateActions(this)">
                        ${roleOptions}
                    </select>
                </td>                
                <td>
                    <select class="action-select" ${isDisabled ? 'disabled' : ''}>
                        <option value="">Chọn hành động</option>
                        ${ROLE_ACTIONS[player.role]?.actions
                            .map(a => `<option value="${a}" ${a === savedAction.action ? 'selected' : ''}>${a}</option>`)
                            .join('')}
                    </select>
                </td>
                <td class="target-cell">
                    ${
                        savedAction.target2
                            ? `
                            <select class="target-select" ${isDisabled ? 'disabled' : ''}>
                                <option value="">Đối tượng 1</option>
                                ${targetOptions}
                            </select>
                            <select class="target-select" ${isDisabled ? 'disabled' : ''}>
                                <option value="">Đối tượng 2</option>
                                ${target2Options}
                            </select>
                        `
                            : `
                            <select class="target-select" ${isDisabled ? 'disabled' : ''}>
                                <option value="">Chọn đối tượng</option>
                                ${targetOptions}
                            </select>
                        `
                    }
                </td>
                <td>${player.status || 'ALIVE'}</td>
                <td>${victoryStatus}</td>
            `;

            if (isDead) {
                row.style.backgroundColor = '#f8d7da'; 
                row.style.color = '#721c24'; 
            }

            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error initializing night phase:', error);
        showError('Có lỗi khi khởi tạo giai đoạn đêm');
    }
}

async function nextPhase() {
    const gameId = sessionStorage.getItem('currentGameId');
    if (!gameId) {
        showError('Không tìm thấy game ID');
        return;
    }

    try {
        await saveActions();

        const phaseResponse = await fetch(`/api/game/${gameId}/phase`);
        const phaseData = await phaseResponse.json();
        const currentPhase = phaseData.current_phase;

        const playersResponse = await fetch(`/api/game/${gameId}/day_status`);
        if (!playersResponse.ok) {
            throw new Error(`HTTP error! status: ${playersResponse.status}`);
        }
        const players = await playersResponse.json();

        const nextPhase = getNextPhase(currentPhase);
        if (!nextPhase) {
            showError('Phase không hợp lệ');
            return;
        }

        await fetch(`/api/game/${gameId}/next_phase`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ next_phase: nextPhase })
        });

        window.location.href = nextPhase.startsWith('DAY') ? '/day' : '/night';
    } catch (error) {
        showError('Có lỗi xảy ra khi lưu dữ liệu');
        console.error(error);
    }
}

function getNextPhase(currentPhase) {
    const match = currentPhase.match(/(DAY|NIGHT)(\d+)/);
    if (!match) {
        return null;
    }

    const phaseType = match[1];
    let phaseNumber = parseInt(match[2], 10);

    if (phaseType === 'NIGHT') {
        return `DAY${phaseNumber}`;
    } else if (phaseType === 'DAY') {
        return `NIGHT${phaseNumber + 1}`;
    }
    return null;
}

function getRoleCounts() {
    const counts = {};
    document.querySelectorAll('.role-select').forEach(select => {
        const role = select.value;
        if (role) {
            counts[role] = (counts[role] || 0) + 1;
        }
    });
    return counts;
}

function updateActions(roleSelect) {
    const row = roleSelect.closest('tr');
    const actionSelect = row.querySelector('.action-select');
    const targetCell = row.querySelector('.target-cell');
    const role = roleSelect.value;
    const oldRole = roleSelect.dataset.currentRole;

    if (ROLE_ACTIONS[oldRole]?.wolfGroup) {
        resetWolfTargets(oldRole);
    }

    if (!role) {
        actionSelect.innerHTML = '<option value="">Chọn hành động</option>';
        updateTargets(actionSelect);
        return;
    }
    
    const roleConfig = ROLE_ACTIONS[role];
    
    if (roleConfig.uniqueRole) {
        const counts = getRoleCounts();
        let isRoleUsed = false;
        document.querySelectorAll('.role-select').forEach(select => {
            if (select !== roleSelect && select.value === role) {
                isRoleUsed = true;
            }
        });
        
        if (isRoleUsed) {
            showError('Vai trò này đã được chọn!');
            roleSelect.value = roleSelect.dataset.currentRole || '';
            return;
        }
    }
    
    roleSelect.dataset.currentRole = role;
    
    const isDisabled = roleConfig.disabled ? 'disabled' : '';
    
    actionSelect.innerHTML = `
        <option value="">Chọn hành động</option>
        ${roleConfig.actions.map(action => 
            `<option value="${action}" ${action === roleConfig.defaultAction ? 'selected' : ''} ${isDisabled}>
                ${action}
            </option>`
        ).join('')}
    `;
    actionSelect.disabled = roleConfig.disabled || role === 'danlang' || role === 'thienthan';
    
    if (role === 'danlang' || role === 'thienthan') {
        targetCell.innerHTML = '<select class="target-select" disabled><option value="">Không cần đối tượng</option></select>';
    } else if (role === 'thantinhyeu') {
        targetCell.innerHTML = `
            <select class="target-select">
                <option value="">Đối tượng 1</option>
                ${getPlayerOptions()}
            </select>
            <select class="target-select">
                <option value="">Đối tượng 2</option>
                ${getPlayerOptions()}
            </select>
        `;
    } else {
        updateTargets(actionSelect);
    }

    actionSelect.onchange = () => {
        if (roleConfig.wolfGroup && actionSelect.value !== 'Cắn') {
            resetWolfTargets(role);
        }
        updateTargets(actionSelect);
    };
    
    updateAllRoleSelects();
}

function updateAllRoleSelects() {
    const counts = getRoleCounts();
    document.querySelectorAll('.role-select').forEach(select => {
        const options = select.querySelectorAll('option');
        options.forEach(option => {
            const role = option.value;
            if (!role) return;
            
            const roleConfig = ROLE_ACTIONS[role];
            const currentCount = counts[role] || 0;
            
            if (roleConfig.uniqueRole && currentCount > 0 && select.value !== role) {
                option.disabled = true;
                option.style.color = '#999';
                option.style.fontStyle = 'italic';
            }
            else if (roleConfig.maxCount) {
                const currentCount = counts[role] || 0;
                if (currentCount >= ROLE_ACTIONS[role].maxCount && select.value !== role) {
                    option.disabled = true;
                    option.style.color = '#999';
                    option.style.fontStyle = 'italic';
                } else {
                    option.disabled = false;
                    option.style.color = '';
                    option.style.fontStyle = '';
                }
            } else {
                option.disabled = false;
                option.style.color = '';
                option.style.fontStyle = '';
            }
        });
    });
}

function updateTargets(actionSelect) {
    const row = actionSelect.closest('tr');
    const targetCell = row.querySelector('.target-cell');
    const roleSelect = row.querySelector('.role-select');
    const role = roleSelect.value;
    const action = actionSelect.value;
    const roleConfig = ROLE_ACTIONS[role];
    const currentPlayer = row.cells[0].textContent.trim();

    const isNoTargetAction = roleConfig.noTargetActions && 
                            roleConfig.noTargetActions.includes(action);
    
    if (isNoTargetAction || roleConfig.disabled || !roleConfig.needsTarget || role === 'danlang' || role === 'thienthan') {
        targetCell.innerHTML = '<select class="target-select" disabled><option value="">Không cần đối tượng</option></select>';
        return;
    }

    targetCell.innerHTML = `
        <select class="target-select">
            <option value="">Chọn đối tượng</option>
            ${getPlayerOptions(currentPlayer)} 
        </select>
    `;

    if (roleConfig.wolfGroup && action === 'Cắn') {
        const targetSelect = targetCell.querySelector('.target-select');
        
        if (wolfTargets.wolves.size === 0) {
            targetSelect.onchange = (e) => {
                wolfTargets.target = e.target.value;
                wolfTargets.wolves.add(role);
            };
        } else {
            targetSelect.onchange = (e) => {
                if (e.target.value !== wolfTargets.target) {
                    showError('Tất cả sói phải cùng cắn một người!');
                    e.target.value = wolfTargets.target || '';
                } else {
                    wolfTargets.wolves.add(role);
                }
            };
        }
    }

    if (role === 'soiquy' && action === 'Biến thành sói') {
        if (wolfTargets.target) {
            targetCell.querySelector('.target-select').value = wolfTargets.target;
        }
    }

    const needsDoubleTarget = roleConfig.alwaysDoubleTarget || 
                            (roleConfig.doubleTargetActions && 
                             roleConfig.doubleTargetActions.includes(action));
    
    if (needsDoubleTarget) {
        targetCell.innerHTML = `
            <select class="target-select">
                <option value="">Đối tượng 1</option>
                ${getPlayerOptions()}
            </select>
            <select class="target-select">
                <option value="">Đối tượng 2</option>
                ${getPlayerOptions()}
            </select>
        `;
    } else {
        targetCell.innerHTML = `
            <select class="target-select">
                <option value="">Chọn đối tượng</option>
                ${getPlayerOptions()}
            </select>
        `;
    }
}

function getPlayerOptions(currentPlayer) {
    const players = JSON.parse(localStorage.getItem('players') || '[]');
    const deadPlayers = new Set(JSON.parse(localStorage.getItem('deadPlayers') || '[]'));
    let currentPlayerRole = '';
    const rows = document.querySelectorAll('#player-table tr');

    rows.forEach(row => {
        const name = row.cells[0].textContent.trim();
        if (name === currentPlayer) {
            currentPlayerRole = row.querySelector('.role-select').value;
        }
    });

    if (players.length === 0) {
        showError('Không có người chơi nào được tìm thấy.');
        return '<option value="">Không có đối tượng</option>';
    }

    return players
        .filter(p => p !== currentPlayer && !deadPlayers.has(p) && !(currentPlayerRole === 'tientri' && p === currentPlayer))
        .map(p => `<option value="${p}">${p}</option>`)
        .join('');
}

async function nextPhase() {
    const gameId = sessionStorage.getItem('currentGameId');
    if (!gameId) {
        showError('Không tìm thấy game ID');
        return;
    }

    try {
        await saveActions();

        const phaseResponse = await fetch(`/api/game/${gameId}/phase`);
        const phaseData = await phaseResponse.json();
        const currentPhase = phaseData.current_phase;

        const playersResponse = await fetch(`/api/game/${gameId}/day_status`);
        if (!playersResponse.ok) {
            throw new Error(`HTTP error! status: ${playersResponse.status}`);
        }
        const players = await playersResponse.json();

        const nextPhase = getNextPhase(currentPhase);
        if (!nextPhase) {
            showError('Phase không hợp lệ');
            return;
        }

        await fetch(`/api/game/${gameId}/next_phase`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ next_phase: nextPhase })
        });

        window.location.href = nextPhase.startsWith('DAY') ? '/day' : '/night';
    } catch (error) {
        showError('Có lỗi xảy ra khi lưu dữ liệu');
        console.error(error);
    }
}

function getNextPhase(currentPhase) {
    const match = currentPhase.match(/(DAY|NIGHT)(\d+)/);
    if (!match) {
        return null;
    }

    const phaseType = match[1];
    let phaseNumber = parseInt(match[2], 10);

    if (phaseType === 'NIGHT') {
        return `DAY${phaseNumber}`;
    } else if (phaseType === 'DAY') {
        return `NIGHT${phaseNumber + 1}`;
    }
    return null;
}

async function updatePhaseDisplay() {
    const gameId = sessionStorage.getItem('currentGameId');
    if (!gameId) return;

    try {
        const response = await fetch(`/api/game/${gameId}/phase`);
        const phaseData = await response.json();
        
        const phaseNumber = phaseData.phase_number;
        const currentPhase = phaseData.current_phase;
        const nightNumber = currentPhase.startsWith('NIGHT') ? phaseNumber : Math.ceil(phaseNumber / 2);
        document.getElementById('night-number').textContent = nightNumber;
    } catch (error) {
        console.error('Error fetching phase:', error);
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

const style = document.createElement('style');
style.textContent = `
  .error-message {
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #ff4444;
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      z-index: 1000;
      animation: fadeIn 0.3s, fadeOut 0.3s 2.7s;
  }
  
  @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
  }
  
  @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
  }

  .winner-message {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: #28a745;
      color: white;
      padding: 20px 40px;
      border-radius: 10px;
      z-index: 1000;
      font-size: 24px;
      text-align: center;
  }
`;
document.head.appendChild(style);

const styleForDisabled = document.createElement('style');
styleForDisabled.textContent = `
    select option:disabled {
        background-color: #f0f0f0;
    }
`;
document.head.appendChild(styleForDisabled); 

function resetWolfTargets(role) {
    if (wolfTargets.wolves.has(role)) {
        wolfTargets.wolves.delete(role);
        if (wolfTargets.wolves.size === 0) {
            wolfTargets.target = null;
        }
    }
}

async function saveActions() {
    const gameId = sessionStorage.getItem('currentGameId');
    if (!gameId) {
        showError('Không tìm thấy game ID');
        return;
    }

    const phaseResponse = await fetch(`/api/game/${gameId}/phase`);
    const phaseData = await phaseResponse.json();
    const currentPhase = phaseData.current_phase;

    const roles = [];
    const actions = [];
    document.querySelectorAll('#player-table tr').forEach(row => {
        const name = row.cells[0].textContent;
        const role = row.querySelector('.role-select')?.value || row.cells[1].textContent.trim();
        const action = row.querySelector('.action-select')?.value || '';
        const targetSelects = row.querySelectorAll('.target-select');
        const targets = Array.from(targetSelects).map(select => select.value).filter(v => v);

        roles.push({ name, role });

        if (action) {
            actions.push({
                player: name,
                action: action,
                target: targets[0],
                target2: targets[1] || null
            });
        }
    });

    try {
        if (currentPhase === 'NIGHT1') {
            await fetch(`/api/game/${gameId}/update_roles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ roles })
            });
        }

        await fetch(`/api/game/${gameId}/actions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phase: currentPhase,
                actions: actions
            })
        });

        return true;
    } catch (error) {
        console.error('Error saving actions:', error);
        showError('Có lỗi khi lưu hành động');
        return false;
    }
}
async function saveActions() {
    const gameId = sessionStorage.getItem('currentGameId');
    if (!gameId) {
        showError('Không tìm thấy game ID');
        return;
    }

    const phaseResponse = await fetch(`/api/game/${gameId}/phase`);
    const phaseData = await phaseResponse.json();
    const currentPhase = phaseData.current_phase;

    const roles = [];
    const actions = [];
    document.querySelectorAll('#player-table tr').forEach(row => {
        const name = row.cells[0].textContent;
        const role = row.querySelector('.role-select')?.value || row.cells[1].textContent.trim();
        const action = row.querySelector('.action-select')?.value || '';
        const targetSelects = row.querySelectorAll('.target-select');
        const targets = Array.from(targetSelects).map(select => select.value).filter(v => v);

        roles.push({ name, role });

        if (action) {
            actions.push({
                player: name,
                action: action,
                target: targets[0],
                target2: targets[1] || null
            });
        }
    });

    try {
        if (currentPhase === 'NIGHT1') {
            await fetch(`/api/game/${gameId}/update_roles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ roles })
            });
        }

        await fetch(`/api/game/${gameId}/actions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phase: currentPhase,
                actions: actions
            })
        });

        return true;
    } catch (error) {
        console.error('Error saving actions:', error);
        showError('Có lỗi khi lưu hành động');
        return false;
    }
}