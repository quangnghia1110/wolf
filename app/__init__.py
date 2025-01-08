from flask import Flask
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql+psycopg2://wolf_db_jy7c_user:bQZGgft7izXwvfqWT3KXPe5LsIrgwDZF@dpg-ctv13456147c739qk3n0-a:5432/wolf_db_jy7c'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-secret-key-here'

db = SQLAlchemy(app)

from app import routes, models 
