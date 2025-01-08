
function updatePlayerCount() {
    const playerInput = document.getElementById('player-input');
    const playerNames = getPlayerNames(playerInput.value);
    document.querySelector('#player-count span').textContent = playerNames.length;
}

function showError(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = message; 
        errorElement.style.display = 'block'; 
        setTimeout(() => {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }, 3000);
    } else {
        console.error("Không tìm thấy phần tử 'error-message'.");
    }
}


function getPlayerNames(input) {
    return input
        .split(/[, \n]+/) 
        .map(name => name.trim()) 
        .filter(name => name); 
}

async function startGame() {
    const playerInput = document.getElementById('player-input');
    const players = getPlayerNames(playerInput.value);
    const gamePhase = document.getElementById('game-phase').value;

    if (players.length < 5) {
        showError('Cần ít nhất 5 người chơi!');
        return;
    }

    if (players.length > 13) {
        showError('Không thể có quá 13 người chơi!');
        return;
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

document.addEventListener('DOMContentLoaded', () => {
    const playerInput = document.getElementById('player-input');
    playerInput.addEventListener('input', updatePlayerCount);
});
