from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://wolf_db_jy7c_user:bQZGgft7izXwvfqWT3KXPe5LsIrgwDZF@dpg-ctv13456l47c739qk3n0-a.oregon-postgres.render.com/wolf_db_jy7c'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-secret-key-here'

db = SQLAlchemy(app)
migrate = Migrate(app, db)

from app import routes, models 