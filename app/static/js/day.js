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
let currentPhase = 'discussion';
let timeLeft = 10;
let timer;

document.addEventListener('DOMContentLoaded', () => {
    initializeDayPhase();
    startTimer();
    updatePhaseDisplay();
});

async function initializeDayPhase() {
    const gameId = sessionStorage.getItem('currentGameId');
    if (!gameId) {
        showError('Không tìm thấy game ID');
        return;
    }

    try {
        const processResponse = await fetch(`/api/game/${gameId}/process_night_actions`);
        if (!processResponse.ok) {
            throw new Error(`HTTP error! status: ${processResponse.status}`);
        }
        const processResult = await processResponse.json();

        const playersResponse = await fetch(`/api/game/${gameId}/day_status`);
        if (!playersResponse.ok) {
            throw new Error(`HTTP error! status: ${playersResponse.status}`);
        }
        const players = await playersResponse.json();
        
        const nightActionsResponse = await fetch(`/api/game/${gameId}/night_actions`);
        if (!nightActionsResponse.ok) {
            throw new Error(`HTTP error! status: ${nightActionsResponse.status}`);
        }
        const nightActions = await nightActionsResponse.json();

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

        const actionMap = new Map(nightActions.map(action => [action.player, action]));
        let hasWinner = false;

        players.forEach(player => {
            const playerAction = actionMap.get(player.name) || {};
            let targetDisplay = playerAction.target || '';

            if (player.role === 'thantinhyeu' && playerAction.action === 'Ghép đôi') {
                targetDisplay = `${playerAction.target || ''}, ${playerAction.target2 || ''}`; 
            }

            let victoryStatus = '';
            const totalPlayers = players.filter(p => p.status !== 'DEAD').length;
            const totalWolves = players.filter(p => p.status !== 'DEAD' && ROLE_ACTIONS[p.role]?.wolfGroup).length;

            if (player.role === 'thienthan' && player.status === 'DEAD') {
                victoryStatus = 'Thiên Thần thắng';
                hasWinner = true;
            } else if (ROLE_ACTIONS[player.role]?.wolfGroup && totalWolves >= totalPlayers / 2) {
                victoryStatus = 'Sói thắng';
                hasWinner = true;
            } else if (totalWolves === 0 && totalPlayers > 0) {
                victoryStatus = 'Dân làng thắng';
                hasWinner = true;
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${player.name}</td>
                <td>${player.role || ''}</td>
                <td>${playerAction.action || ''}</td>
                <td>${targetDisplay}</td>
                <td>${player.status || 'ALIVE'}</td>
                <td>${victoryStatus}</td>
            `;

            if (player.isDead || (processResult.dead_players && processResult.dead_players.includes(player.name))) {
                row.classList.add('dead-player');
            }

            tbody.appendChild(row);
        });
        if (hasWinner) {
            const elementsToHide = [
        'phase-container',
        'voting-container',
        'defense-container',
        'timer',
        'phase',
        'time-config-defense',
        'time-config-voting',
        'time-input-discussion'
    ];

    elementsToHide.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'none';
        }
    });
            let countdown = 10;
            const winnerDiv = document.createElement('div');
            winnerDiv.className = 'winner-message';
            document.body.appendChild(winnerDiv);

            const countdownInterval = setInterval(() => {
                countdown--;
                if (countdown > 0) {
                    winnerDiv.textContent = `Trò chơi đã kết thúc! Chuyển về trang chủ sau ${countdown} giây...`;
                } else {
                    clearInterval(countdownInterval);
                    window.location.href = '/';
                }
            }, 1000);
        }
    } catch (error) {
        console.error('Error initializing day phase:', error);
        showError('Có lỗi khi khởi tạo giai đoạn ban ngày');
    }
}

function startTimer(inputId) {
    clearInterval(timer);

    const timeInput = document.getElementById(inputId);

    if (!timeInput) {
        console.error(`Không tìm thấy phần tử với id: ${inputId}`);
        return;
    }

    const inputTime = parseInt(timeInput.value, 10);

    if (!isNaN(inputTime) && inputTime > 0) {
        timeLeft = inputTime; 
    } else {
        console.warn('Thời gian nhập không hợp lệ, sử dụng mặc định 120 giây');
        timeLeft = 120; 
    }

    updateTimerDisplay();

    timer = setInterval(() => {
        if (timeLeft <= 0) {
            clearInterval(timer); 
            timeLeft = 0; 
            updateTimerDisplay(); 
            handlePhaseEnd();
        } else {
            timeLeft--; 
            updateTimerDisplay();
        }
    }, 1000);
}



function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('timer').textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function handlePhaseEnd() {
    switch (currentPhase) {
        case 'discussion':
            startVotingPhase();
            break;
        case 'voting':
            startDefensePhase();
        case 'defense':
            const defenseDecision = localStorage.getItem('defenseDecision');
            if (!defenseDecision) {
                showError('Hãy chọn sống hoặc chết trước khi tiếp tục!');
                return; // Không chuyển giai đoạn nếu chưa chọn kết quả biện minh
            }
            endDay();
            break;
    }
}

function startDiscussionPhase() {
    currentPhase = 'discussion';
    document.getElementById('phase').textContent = 'Thảo luận';
    document.getElementById('voting-container').style.display = 'none';
    document.getElementById('defense-container').style.display = 'none';
    document.getElementById('time-config-voting').style.display = 'none';
    document.getElementById('time-config-defense').style.display = 'none';
    document.getElementById('time-input-discussion').parentElement.style.display = 'block';
    startTimer('time-input-discussion'); 
}

async function startVotingPhase() {
    const gameId = sessionStorage.getItem('currentGameId');
    if (!gameId) {
        showError('Không tìm thấy game ID');
        return;
    }

    currentPhase = 'voting';
    votedPlayer = null;
    document.getElementById('phase').textContent = 'Bỏ phiếu';
    document.getElementById('voting-container').style.display = 'block';
    document.getElementById('defense-container').style.display = 'none';
    document.getElementById('time-config-defense').style.display = 'none';
    document.getElementById('time-config-voting').style.display = 'block';
    try {
        const response = await fetch(`/api/game/${gameId}/day_status`);
        const players = await response.json();

        const voteTarget = document.getElementById('vote-target');
        voteTarget.innerHTML = '<option value="">Chọn người chơi</option>';

        players
            .filter(player => !player.isDead)
            .forEach(player => {
                const option = document.createElement('option');
                option.value = player.name;
                option.textContent = player.name;
                voteTarget.appendChild(option);
            });
        startTimer('time-input-voting');
    } catch (error) {
        console.error('Error starting voting phase:', error);
        showError('Có lỗi khi bắt đầu giai đoạn bỏ phiếu');
    }
}

function startDefensePhase() {
    currentPhase = 'defense';
    document.getElementById('phase').textContent = 'Biện minh';
    document.getElementById('voting-container').style.display = 'none';
    document.getElementById('defense-container').style.display = 'block';
    document.getElementById('time-config-voting').style.display = 'none';
    document.getElementById('time-config-defense').style.display = 'block';

    const voteTarget = document.getElementById('vote-target');
    votedPlayer = voteTarget.value;
    if (!votedPlayer || votedPlayer === 'Chọn người chơi') {
        console.log('Không có người chơi được chọn để biện minh. Chuyển sang đêm.');
        endDay(); 
        return;
    }
    document.getElementById('defense-player').textContent = votedPlayer;
    startTimer('time-input-defense');
}

async function handleDefense(isAlive) {
    const gameId = sessionStorage.getItem('currentGameId');
    if (!gameId || !votedPlayer) return;

    try {
        localStorage.setItem('defenseDecision', isAlive ? 'ALIVE' : 'DEAD');

        await fetch(`/api/game/${gameId}/update_status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                status_updates: [{
                    player: votedPlayer,
                    status: isAlive ? 'ALIVE' : 'DEAD'
                }]
            })
        });

        window.location.href = '/night';
    } catch (error) {
        console.error('Error updating game state:', error);
        showError('Có lỗi khi cập nhật trạng thái game');
    }
}

function saveDayTableData() {
    const table = document.getElementById('player-table');
    const rows = table.querySelectorAll('tr');
    const dayData = [];

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length === 5) {
            dayData.push({
                name: cells[0].textContent.trim(),
                role: cells[1].textContent.trim(),
                action: cells[2].textContent.trim(),
                targets: cells[3].textContent.trim(),
                status: cells[4].textContent.trim()
            });
        }
    });

    localStorage.setItem('dayData', JSON.stringify(dayData));
}

function submitVote() {
    const voteTarget = document.getElementById('vote-target').value;
    if (voteTarget && voteTarget !== 'Chọn người chơi') {
        votedPlayer = voteTarget;
        console.log(`Người chơi ${voteTarget} đã được bỏ phiếu.`);
    }
    let votes = JSON.parse(localStorage.getItem('votes') || '{}');
    votes[voteTarget] = (votes[voteTarget] || 0) + 1;
    localStorage.setItem('votes', JSON.stringify(votes));

    handlePhaseEnd();
}

document.addEventListener('DOMContentLoaded', () => {
    initializeDayPhase(); 
});

function endDay() {
    localStorage.removeItem('defenseDecision'); 
    const playerData = [];
    const rows = document.querySelectorAll('#player-table tr');

    rows.forEach(row => {
        const name = row.cells[0].textContent.trim();
        const role = row.cells[1].textContent.trim();
        const status = row.cells[4].textContent.trim();

        playerData.push({ name, role, status });
    });

    localStorage.setItem('dayPlayerData', JSON.stringify(playerData));

    window.location.href = '/night';
}

async function updatePhaseDisplay() {
    const gameId = sessionStorage.getItem('currentGameId');
    if (!gameId) return;

    try {
        const response = await fetch(`/api/game/${gameId}/phase`);
        const phaseData = await response.json();
        
        document.getElementById('day-number').textContent = phaseData.phase_number;
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
`;
document.head.appendChild(style);

