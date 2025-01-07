from flask import Flask
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql+psycopg2://werewolf_db_user:tVnynOeUPCHF2opx5pfcg11ONPCdaqiA@dpg-ctukrd3qf0us73f5mi9g-a.oregon-postgres.render.com:5432/werewolf_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-secret-key-here'

db = SQLAlchemy(app)

from app import routes, models 