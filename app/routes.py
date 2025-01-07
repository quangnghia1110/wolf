from app import app, db
from app.models import Game, Player, Action
from flask import jsonify, request, render_template
import uuid

@app.route('/')
def setup():
    return render_template('setup.html')

@app.route('/night')
def night():
    return render_template('night.html')

@app.route('/day')
def day():
    return render_template('day.html')

@app.route('/api/game/new', methods=['POST'])
def create_game():
    game_name = f"Game_{uuid.uuid4().hex[:8]}"
    new_game = Game(
        name=game_name,
        current_phase='NIGHT1'
    )
    db.session.add(new_game)
    db.session.commit()
    
    players_data = request.json.get('players', [])
    for player_name in players_data:
        player = Player(name=player_name, game_id=new_game.id)
        db.session.add(player)
    
    db.session.commit()

    thienthan = Player.query.filter_by(game_id=new_game.id, role='thienthan').first()
    if thienthan and thienthan.status == 'DEAD':
        return jsonify({'game_id': new_game.id, 'message': 'Thiên Thần thắng'})

    return jsonify({'game_id': new_game.id})

@app.route('/api/game/<int:game_id>/players', methods=['GET'])
def get_game_players(game_id):
    players = Player.query.filter_by(game_id=game_id).all()
    return jsonify([{
        'id': p.id,
        'name': p.name,
        'role': p.role,
        'status': p.status
    } for p in players])

@app.route('/api/game/<int:game_id>/update_roles', methods=['POST'])
def update_roles(game_id):
    roles_data = request.json.get('roles', [])
    for role_data in roles_data:
        player = Player.query.filter_by(
            game_id=game_id, 
            name=role_data['name']
        ).first()
        if player:
            player.role = role_data['role']
    
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/game/<int:game_id>/actions', methods=['POST'])
def save_actions(game_id):
    data = request.json
    phase = data.get('phase')
    actions = data.get('actions', [])
    
    for action_data in actions:
        actor = Player.query.filter_by(
            game_id=game_id,
            name=action_data['player']
        ).first()
        
        if actor:
            if actor.role == 'phuthuy':
                if action_data['action'] == 'Dùng bình cứu':
                    actor.used_save_potion = True
                elif action_data['action'] == 'Dùng bình độc':
                    actor.used_kill_potion = True
            elif actor.role == 'thantinhyeu' and action_data['action'] == 'Ghép đôi':
                actor.used_cupid = True

            target = None
            target2 = None

            if action_data.get('target'):
                target = Player.query.filter_by(
                    game_id=game_id,
                    name=action_data['target']
                ).first()
            
            if action_data.get('target2'):
                target2 = Player.query.filter_by(
                    game_id=game_id,
                    name=action_data['target2']
                ).first()
            if actor.role == 'soiquy' and action_data['action'] == 'Biến thành sói':
                target = Player.query.filter_by(
                    game_id=game_id,
                    name=action_data['target']
                ).first()

                if target:
                    target.is_transforming = True
                    db.session.add(target)
            action = Action(
                game_id=game_id,
                player_id=actor.id,
                target_id=target.id if target else None,
                target_id_2=target2.id if target2 else None,
                action_type=action_data['action'],
                time_phase=phase
            )
            db.session.add(action)
    
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/game/<int:game_id>/player_abilities', methods=['GET'])
def get_player_abilities(game_id):
    players = Player.query.filter_by(game_id=game_id).all()
    abilities = {}
    for player in players:
        if player.role == 'phuthuy':
            abilities[player.name] = {
                'can_save': not player.used_save_potion,
                'can_kill': not player.used_kill_potion
            }
        elif player.role == 'thantinhyeu':
            abilities[player.name] = {
                'can_couple': not player.used_cupid
            }
    return jsonify(abilities)

@app.route('/api/game/<int:game_id>/night_actions', methods=['GET'])
def get_night_actions(game_id):
    current_phase = request.args.get('phase', 'NIGHT1')
    
    actions = Action.query.filter_by(
        game_id=game_id,
        time_phase=current_phase
    ).all()
    
    actions_data = []
    for action in actions:
        action_data = {
            'player': action.actor.name if action.actor else None,
            'role': action.actor.role if action.actor else None,
            'action': action.action_type,
            'target': action.target.name if action.target else None,
            'target2': Player.query.get(action.target_id_2).name if action.target_id_2 else None,
            'status': action.actor.status if action.actor else None
        }
        actions_data.append(action_data)
    
    return jsonify(actions_data)

@app.route('/api/game/<int:game_id>/update_status', methods=['POST'])
def update_player_status(game_id):
    status_data = request.json.get('status_updates', [])
    for update in status_data:
        player = Player.query.filter_by(
            game_id=game_id,
            name=update['player']
        ).first()
        if player:
            player.status = update['status']
    
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/game/<int:game_id>/day_status', methods=['GET'])
def get_day_status(game_id):
    players = Player.query.filter_by(game_id=game_id).all()
    return jsonify([{
        'name': p.name,
        'role': p.role,
        'status': p.status,
        'isDead': p.status == 'DEAD'
    } for p in players])

@app.route('/api/game/<int:game_id>/next_phase', methods=['POST'])
def next_phase(game_id):
    game = Game.query.get(game_id)
    if not game:
        return jsonify({'error': 'Game not found'}), 404
    
    current_phase = game.current_phase
    phase_type, phase_number = current_phase[:-1], int(current_phase[-1])
    
    if phase_type == 'NIGHT':
        actions = Action.query.filter_by(
            game_id=game_id,
            time_phase=current_phase
        ).all()

        wolf_target = None
        wolf_count = 0
        protected_player = None
        coupled_players = []
        hunter_target = None
        witch_saved = None
        witch_killed = None
        transformed_to_wolf = None
        dead_players = set()
        death_reasons = {}

        for action in actions:
            if action.target:
                if 'soi' in action.actor.role and action.action_type == 'Cắn':
                    if wolf_target is None:
                        wolf_target = action.target.name
                        wolf_count = 1
                    elif wolf_target == action.target.name:
                        wolf_count += 1
                elif action.actor.role == 'baove' and action.action_type == 'Bảo vệ':
                    protected_player = action.target.name
                elif action.actor.role == 'thantinhyeu' and action.action_type == 'Ghép đôi':
                    couple = [action.target.name]
                    if action.target_id_2:
                        second_target = Player.query.get(action.target_id_2)
                        if second_target:
                            couple.append(second_target.name)
    
                    if len(couple) == 2:
                        coupled_players.append(couple)
                elif action.actor.role == 'thosan' and action.action_type == 'Kéo theo':
                    hunter_target = action.target.name
                elif action.actor.role == 'phuthuy':
                    if action.action_type == 'Dùng bình cứu':
                        witch_saved = action.target.name
                    elif action.action_type == 'Dùng bình độc':
                        witch_killed = action.target.name
                elif action.actor.role == 'soiquy' and action.action_type == 'Biến thành sói':
                    if not action.actor.transformed and not action.actor.is_transforming:
                        action.actor.is_transforming = True
                        if action.target:
                            protected_player = action.target.name

        def add_death(player, reason):
            if player not in dead_players and (reason != "Bị sói cắn" or player != protected_player):
                transforming_player = Player.query.filter_by(game_id=game.id, name=player, is_transforming=True).first()
                if transforming_player:
                     return
                dead_players.add(player)
                death_reasons[player] = reason
                
                for couple in coupled_players:
                    if player in couple:
                        for coupled_player in couple:
                            if coupled_player != player and coupled_player not in dead_players:
                                add_death(coupled_player, f"Chết do được ghép đôi với {player}")
        
                hunter = Player.query.filter_by(game_id=game_id, name=player, role='thosan').first()
                if hunter and hunter_target:
                    add_death(hunter_target, f"Bị thợ săn {player} kéo theo")

        if wolf_target and wolf_count > 0 and wolf_target != witch_saved:
            add_death(wolf_target, "Bị sói cắn")

        if witch_killed:
            add_death(witch_killed, "Bị phù thủy giết")

        for player_name in dead_players:
            player = Player.query.filter_by(game_id=game_id, name=player_name).first()
            if player:
                player.status = 'DEAD'

        if transformed_to_wolf and transformed_to_wolf not in dead_players:
            transformed_player = Player.query.filter_by(
                game_id=game_id, 
                name=transformed_to_wolf
            ).first()
            if transformed_player:
                transformed_player.role = 'masoi'

        db.session.commit()
        game.current_phase = f'DAY{phase_number}'
    elif phase_type == 'DAY':
        transforming_players = Player.query.filter_by(game_id=game_id, is_transforming=True).all()
        for player in transforming_players:
            player.role = 'masoi'
            player.transformed = True
            player.is_transforming = False

        db.session.commit()

        game.current_phase = f'NIGHT{phase_number + 1}'

    thienthan = Player.query.filter_by(game_id=game_id, role='thienthan').first()
    if thienthan and thienthan.status == 'DEAD':
        return jsonify({'message': 'Thiên Thần thắng', 'next_phase': game.current_phase})

    db.session.commit()
    return jsonify({
        'next_phase': game.current_phase,
        'phase_type': game.current_phase[:-1],
        'phase_number': int(game.current_phase[-1]),
        'dead_players': list(dead_players) if phase_type == 'NIGHT' else []
    })

@app.route('/api/game/<int:game_id>/phase', methods=['GET'])
def get_phase(game_id):
    game = Game.query.get(game_id)
    if not game:
        return jsonify({'error': 'Game not found'}), 404
    
    return jsonify({
        'current_phase': game.current_phase,
        'phase_type': game.current_phase[:-1],
        'phase_number': int(game.current_phase[-1])
    })

@app.route('/api/game/<int:game_id>/process_night_actions', methods=['GET'])
def process_night_actions(game_id):
    try:
        game = Game.query.get(game_id)
        if not game:
            return jsonify({'error': 'Game not found'}), 404

        actions = Action.query.filter_by(
            game_id=game_id,
            time_phase=game.current_phase
        ).all()

        result = process_night_actions_logic(game, actions)
        return jsonify(result)

    except Exception as e:
        print(f"Error processing night actions: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

def process_night_actions_logic(game, actions):
    try:
        wolf_target = None
        wolf_count = 0
        protected_player = None
        coupled_players = []
        hunter_target = None
        witch_saved = None
        witch_killed = None
        transformed_to_wolf = None
        dead_players = set()
        death_reasons = {}

        for action in actions:
            if not action.target:
                continue
                
            if 'soi' in action.actor.role and action.action_type == 'Cắn':
                if wolf_target is None:
                    wolf_target = action.target.name
                    wolf_count = 1
                elif wolf_target == action.target.name:
                    wolf_count += 1
            elif action.actor.role == 'baove' and action.action_type == 'Bảo vệ':
                protected_player = action.target.name
            elif action.actor.role == 'thantinhyeu' and action.action_type == 'Ghép đôi':
                coupled_players = []
                coupled_players.append(action.target.name)
                
                second_target = Action.query.filter_by(
                    game_id=game.id,
                    time_phase=game.current_phase,
                    player_id=action.player_id,
                    action_type='Ghép đôi_target2'
                ).first()
                
                if second_target and second_target.target:
                    coupled_players.append(second_target.target.name)
            elif action.actor.role == 'thosan' and action.action_type == 'Kéo theo':
                hunter_target = action.target.name
            elif action.actor.role == 'phuthuy':
                if action.action_type == 'Dùng bình cứu':
                    witch_saved = action.target.name
                elif action.action_type == 'Dùng bình độc':
                    witch_killed = action.target.name
            elif action.actor.role == 'soiquy' and action.action_type == 'Biến thành sói':
                if not action.actor.transformed and not action.actor.is_transforming:
                    action.actor.is_transforming = True
                    if action.target:
                        protected_player = action.target.name

        def add_death(player, reason):
            if player not in dead_players and (reason != "Bị sói cắn" or player != protected_player):
                transforming_player = Player.query.filter_by(game_id=game.id, name=player, is_transforming=True).first()
                if transforming_player:
                     return
                dead_players.add(player)
                death_reasons[player] = reason
                
                for couple in coupled_players:
                    if player in couple:
                        for coupled_player in couple:
                            if coupled_player != player and coupled_player not in dead_players:
                                add_death(coupled_player, f"Chết do được ghép đôi với {player}")
        
                hunter = Player.query.filter_by(game_id=game.id, name=player, role='thosan').first()
                if hunter and hunter_target:
                    add_death(hunter_target, f"Bị thợ săn {player} kéo theo")

        if wolf_target and wolf_count > 0 and wolf_target != witch_saved:
            add_death(wolf_target, "Bị sói cắn")

        if witch_killed:
            add_death(witch_killed, "Bị phù thủy giết")

        for player_name in dead_players:
            player = Player.query.filter_by(game_id=game.id, name=player_name).first()
            if player:
                player.status = 'DEAD'

        if transformed_to_wolf and transformed_to_wolf not in dead_players:
            transformed_player = Player.query.filter_by(
                game_id=game.id, 
                name=transformed_to_wolf
            ).first()
            if transformed_player:
                transformed_player.role = 'masoi'

        db.session.commit()

        return {
            'dead_players': list(dead_players),
            'death_reasons': death_reasons,
            'transformed_player': transformed_to_wolf if transformed_to_wolf else None,
            'wolf_target': wolf_target,
            'wolf_count': wolf_count,
            'protected_player': protected_player,
            'witch_saved': witch_saved,
            'coupled_players': coupled_players
        }
        
    except Exception as e:
        print(f"Error in process_night_actions_logic: {str(e)}")
        db.session.rollback()
        raise e