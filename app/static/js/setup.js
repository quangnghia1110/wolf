document.addEventListener('DOMContentLoaded', () => {
    for(let i = 0; i < 12; i++) {
        addPlayer();
    }
});

function addPlayer() {
    const container = document.getElementById('player-container');
    const playerCount = container.children.length;
    
    if (playerCount >= 13) {
        showError('Không thể thêm quá 13 người chơi!');
        return;
    }

    const slot = document.createElement('div');
    slot.className = 'player-slot';
    slot.innerHTML = `
        <input type="text" placeholder="Tên người chơi ${playerCount + 1}" required>
        <button onclick="removePlayer(this)">Xóa</button>
    `;
    
    container.appendChild(slot);
    updatePlayerCount();
}

function removePlayer(button) {
    const container = document.getElementById('player-container');
    if (container.children.length <= 5) {
        showError('Cần ít nhất 5 người chơi!');
        return;
    }
    
    button.parentElement.remove();
    updatePlayerCount();
}

function updatePlayerCount() {
    const count = document.getElementById('player-container').children.length;
    document.querySelector('#player-count span').textContent = count;
}

function showError(message) {
    const errorElement = document.getElementById('error-message');
    errorElement.textContent = message;
    setTimeout(() => {
        errorElement.textContent = '';
    }, 3000);
}

async function startGame() {
    const container = document.getElementById('player-container');
    const players = [];
    const gamePhase = document.getElementById('game-phase').value;
    
    for (let slot of container.children) {
        const name = slot.querySelector('input').value.trim();
        if (!name) {
            showError('Vui lòng điền tên tất cả người chơi!');
            return;
        }
        players.push(name);
    }

    try {
        const response = await fetch('/api/game/new', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ players, phase: gamePhase })
        });
        
        const data = await response.json();
        sessionStorage.setItem('currentGameId', data.game_id);
        window.location.href = '/night';
    } catch (error) {
        showError('Có lỗi xảy ra khi tạo game mới');
    }
}

