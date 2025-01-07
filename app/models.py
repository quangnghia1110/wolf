from app import db
from datetime import datetime

class Game(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    current_phase = db.Column(db.String(20), default='NIGHT1')
    players = db.relationship('Player', backref='game', lazy=True)
    actions = db.relationship('Action', backref='game', lazy=True)

class Player(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(50))
    game_id = db.Column(db.Integer, db.ForeignKey('game.id'), nullable=False)
    actions_performed = db.relationship('Action', 
                                      backref='actor',
                                      lazy=True,
                                      foreign_keys='Action.player_id')
    actions_targeted = db.relationship('Action',
                                     backref='target',
                                     lazy=True, 
                                     foreign_keys='Action.target_id')
    status = db.Column(db.String(20), default='ALIVE')
    used_save_potion = db.Column(db.Boolean, default=False) 
    used_kill_potion = db.Column(db.Boolean, default=False)  
    used_cupid = db.Column(db.Boolean, default=False)       
    transformed = db.Column(db.Boolean, default=False)      
    is_transforming = db.Column(db.Boolean, default=False)   

class Action(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    game_id = db.Column(db.Integer, db.ForeignKey('game.id'), nullable=False)
    player_id = db.Column(db.Integer, db.ForeignKey('player.id', ondelete='CASCADE'), nullable=False)
    target_id = db.Column(db.Integer, db.ForeignKey('player.id', ondelete='SET NULL'), nullable=True)
    target_id_2 = db.Column(db.Integer, db.ForeignKey('player.id', ondelete='SET NULL'), nullable=True) 
    action_type = db.Column(db.String(50))
    time_phase = db.Column(db.String(20)) 
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
