from flask import Flask, render_template, request, jsonify, session, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
import os
import openai
import base64
from PIL import Image
import io
import json
import concurrent.futures
from werkzeug.middleware.proxy_fix import ProxyFix
from datetime import datetime, timedelta
import secrets
import logging
from logging.handlers import RotatingFileHandler
from functools import wraps
from werkzeug.utils import secure_filename
import sys
import jwt

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Configure logging to stdout for Render
stream_handler = logging.StreamHandler(sys.stdout)
stream_handler.setLevel(logging.INFO)
app.logger.addHandler(stream_handler)
app.logger.setLevel(logging.INFO)

# Configure app for production
app.config['PREFERRED_URL_SCHEME'] = 'https'
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Configure upload folder
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'static', 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Configure database
if os.environ.get('FLASK_ENV') == 'production':
    # Using PostgreSQL on Render
    db_url = os.environ.get('DATABASE_URL')
    if db_url:
        # Handle both postgres:// and postgresql:// for compatibility
        if db_url.startswith('postgres://'):
            db_url = db_url.replace('postgres://', 'postgresql://', 1)
        app.config['SQLALCHEMY_DATABASE_URI'] = db_url
        app.logger.info("Using PostgreSQL database")
    else:
        app.logger.warning("DATABASE_URL not set, falling back to SQLite")
        sqlite_path = os.path.join(os.getcwd(), 'grocery.db')
        app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{sqlite_path}'
else:
    # Using SQLite locally
    sqlite_path = os.path.join(os.getcwd(), 'grocery.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{sqlite_path}'
    app.logger.info(f"Using SQLite database at {sqlite_path}")

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-here')
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg'}

# Security headers
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline' cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"
    return response

# Initialize OpenAI client
openai.api_key = os.getenv('OPENAI_API_KEY')

# Initialize extensions
db = SQLAlchemy(app)
migrate = Migrate(app, db)
CORS(app)

# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    password = db.Column(db.String(128))
    role = db.Column(db.String(20), default='user')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    items = db.relationship('GroceryItem', backref='user', lazy=True)

    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)

class GroceryItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    calories = db.Column(db.Float)
    protein = db.Column(db.Float)
    carbs = db.Column(db.Float)
    fat = db.Column(db.Float)
    fiber = db.Column(db.Float)
    sugar = db.Column(db.Float)
    sodium = db.Column(db.Float)
    cholesterol = db.Column(db.Float)
    product_image = db.Column(db.String(255))
    nutrition_image = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Create tables on startup
with app.app_context():
    db.create_all()

def optimize_image(image_data, max_size=1024, quality=85):
    """Optimize image size and quality for AI processing."""
    try:
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if needed
        if image.mode in ('RGBA', 'P'):
            image = image.convert('RGB')
        
        # Resize if needed
        if max(image.size) > max_size:
            ratio = max_size / max(image.size)
            new_size = tuple(int(dim * ratio) for dim in image.size)
            image = image.resize(new_size, Image.Resampling.LANCZOS)
        
        # Save with optimized quality
        buffered = io.BytesIO()
        image.save(buffered, format="JPEG", quality=quality, optimize=True)
        return buffered.getvalue()
        
    except Exception as e:
        app.logger.error(f"Error optimizing image: {str(e)}")
        return image_data

def analyze_image_with_gpt4(image_data, is_nutrition_label=False):
    """Analyze an image using GPT-4 Vision API."""
    try:
        # Optimize image before processing
        optimized_data = optimize_image(image_data)
        img_str = base64.b64encode(optimized_data).decode()

        if is_nutrition_label:
            prompt = """Analyze this nutrition label. Return ONLY a JSON object with these fields (no other text):
{
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number,
    "fiber": number,
    "sugar": number,
    "sodium": number,
    "cholesterol": number
}
Use null for missing values. Remove units. For "<1g" use 0.5."""
        else:
            prompt = "What is the exact product name shown in this image? Return ONLY the name, no other text."

        response = openai.ChatCompletion.create(
            model="gpt-4o",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{img_str}"
                        }
                    }
                ]
            }],
            max_tokens=150 if not is_nutrition_label else 500,
            temperature=0.1
        )
        
        result = response.choices[0].message.content.strip()
        app.logger.info(f"GPT-4 Vision response: {result}")
        
        if is_nutrition_label:
            try:
                # Clean and parse JSON response
                result = result.replace("'", '"')
                if not result.startswith('{'): # Find JSON in response
                    start = result.find('{')
                    end = result.rfind('}') + 1
                    if start != -1 and end != 0:
                        result = result[start:end]
                
                nutrition_data = json.loads(result)
                
                # Ensure all fields exist and convert to float
                required_fields = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'cholesterol']
                return {field: float(nutrition_data.get(field)) if nutrition_data.get(field) is not None else None 
                       for field in required_fields}
                
            except Exception as e:
                app.logger.error(f"Error processing nutrition data: {e}")
                return {field: None for field in required_fields}
        else:
            return result if result else "Unknown Product"
            
    except Exception as e:
        app.logger.error(f"Error in analyze_image_with_gpt4: {e}")
        if is_nutrition_label:
            return {
                "calories": None, "protein": None, "carbs": None,
                "fat": None, "fiber": None, "sugar": None,
                "sodium": None, "cholesterol": None
            }
        return "Unknown Product"

@app.route('/')
def index():
    return render_template('index.html')

def create_token(user_id, username):
    """Create a JWT token."""
    payload = {
        'user_id': user_id,
        'username': username,
        'exp': datetime.utcnow() + timedelta(days=1)
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        try:
            token = token.split(' ')[1]  # Remove 'Bearer ' prefix
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.filter_by(id=data['user_id']).first()
            if not current_user:
                return jsonify({'error': 'Invalid token'}), 401
            # Store user info in request context
            request.current_user = current_user
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        return f(*args, **kwargs)
    return decorated

@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        email = data.get('email')
        
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
            
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already exists'}), 400
            
        if email and User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already exists'}), 400
            
        user = User(username=username, email=email)
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        token = create_token(user.id, username)
        return jsonify({
            'token': token,
            'user': {
                'id': user.id,
                'username': username,
                'email': email
            }
        }), 201
        
    except Exception as e:
        app.logger.error(f"Registration error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Registration failed'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
        
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            # Update last login time
            user.last_login = datetime.utcnow()
            db.session.commit()
            
            token = create_token(user.id, username)
            return jsonify({
                'token': token,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role
                }
            }), 200
        
        return jsonify({'error': 'Invalid username or password'}), 401
        
    except Exception as e:
        app.logger.error(f"Login error: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500

@app.route('/api/auth/verify', methods=['GET'])
@token_required
def verify_token():
    return jsonify({
        'user': {
            'id': request.current_user.id,
            'username': request.current_user.username,
            'email': request.current_user.email,
            'role': request.current_user.role
        }
    })

@app.route('/api/auth/logout', methods=['POST'])
@token_required
def logout():
    return jsonify({'message': 'Logged out successfully'})

@app.route('/api/items', methods=['GET'])
@token_required
def get_items():
    items = GroceryItem.query.filter_by(user_id=session['user_id']).all()
    return jsonify([{
        'id': item.id,
        'name': item.name,
        'price': item.price,
        'quantity': item.quantity,
        'calories': item.calories,
        'protein': item.protein,
        'carbs': item.carbs,
        'fat': item.fat,
        'fiber': item.fiber,
        'sugar': item.sugar,
        'sodium': item.sodium,
        'cholesterol': item.cholesterol,
        'product_image': item.product_image,
        'nutrition_image': item.nutrition_image,
        'created_at': item.created_at.isoformat(),
        'updated_at': item.updated_at.isoformat()
    } for item in items])

@app.route('/api/items', methods=['POST'])
@token_required
def add_item():
    try:
        app.logger.info("Starting add_item process")
        
        # Validate form data
        if 'product_image' not in request.files or 'nutrition_image' not in request.files:
            return jsonify({'error': 'Both product and nutrition images are required'}), 400
            
        product_image = request.files['product_image']
        nutrition_image = request.files['nutrition_image']
        
        if not product_image.filename or not nutrition_image.filename:
            return jsonify({'error': 'Both images are required'}), 400
            
        if not allowed_file(product_image.filename) or not allowed_file(nutrition_image.filename):
            return jsonify({'error': 'Only PNG, JPG, and JPEG files are allowed'}), 400
        
        try:
            price = float(request.form.get('price', 0))
            quantity = int(request.form.get('quantity', 1))
            
            if price < 0 or quantity < 1:
                return jsonify({'error': 'Invalid price or quantity'}), 400
        except ValueError:
            return jsonify({'error': 'Invalid price or quantity format'}), 400
        
        # Read and optimize image data
        product_data = optimize_image(product_image.read())
        nutrition_data = optimize_image(nutrition_image.read())
        
        app.logger.info("Analyzing images with GPT-4")
        
        # Create new item with basic info first
        new_item = GroceryItem(
            user_id=session['user_id'],
            name="Processing...",
            price=price,
            quantity=quantity
        )
        db.session.add(new_item)
        db.session.commit()
        
        try:
            # Save images first
            product_filename = f"product_{new_item.id}.jpg"
            nutrition_filename = f"nutrition_{new_item.id}.jpg"
            
            with open(os.path.join(UPLOAD_FOLDER, product_filename), 'wb') as f:
                f.write(product_data)
            with open(os.path.join(UPLOAD_FOLDER, nutrition_filename), 'wb') as f:
                f.write(nutrition_data)
            
            new_item.product_image = product_filename
            new_item.nutrition_image = nutrition_filename
            db.session.commit()
            
            # Analyze images
            product_name = analyze_image_with_gpt4(product_data, is_nutrition_label=False)
            nutrition_info = analyze_image_with_gpt4(nutrition_data, is_nutrition_label=True)
            
            # Update item with analysis results
            new_item.name = product_name
            if nutrition_info:
                new_item.calories = nutrition_info.get('calories')
                new_item.protein = nutrition_info.get('protein')
                new_item.carbs = nutrition_info.get('carbs')
                new_item.fat = nutrition_info.get('fat')
                new_item.fiber = nutrition_info.get('fiber')
                new_item.sugar = nutrition_info.get('sugar')
                new_item.sodium = nutrition_info.get('sodium')
                new_item.cholesterol = nutrition_info.get('cholesterol')
            
            db.session.commit()
            app.logger.info(f"Successfully added item {new_item.id}")
            
            return jsonify({
                'id': new_item.id,
                'name': new_item.name,
                'price': new_item.price,
                'quantity': new_item.quantity,
                'calories': new_item.calories,
                'protein': new_item.protein,
                'carbs': new_item.carbs,
                'fat': new_item.fat,
                'fiber': new_item.fiber,
                'sugar': new_item.sugar,
                'sodium': new_item.sodium,
                'cholesterol': new_item.cholesterol,
                'product_image': new_item.product_image,
                'nutrition_image': new_item.nutrition_image,
                'created_at': new_item.created_at.isoformat(),
                'updated_at': new_item.updated_at.isoformat()
            })
            
        except Exception as e:
            app.logger.error(f"Error processing item: {str(e)}")
            db.session.delete(new_item)
            db.session.commit()
            raise
            
    except Exception as e:
        app.logger.error(f"Error in add_item: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/items/<int:item_id>', methods=['DELETE'])
@token_required
def delete_item(item_id):
    item = GroceryItem.query.filter_by(id=item_id, user_id=session['user_id']).first_or_404()
    
    # Delete associated images
    if item.product_image:
        try:
            os.remove(os.path.join(UPLOAD_FOLDER, item.product_image))
        except Exception:
            pass
    if item.nutrition_image:
        try:
            os.remove(os.path.join(UPLOAD_FOLDER, item.nutrition_image))
        except Exception:
            pass
    
    db.session.delete(item)
    db.session.commit()
    
    return jsonify({'message': 'Item deleted successfully'})

@app.route('/api/items/<int:item_id>/nutrition', methods=['PATCH'])
def update_nutrition(item_id):
    try:
        data = request.get_json()
        item = GroceryItem.query.get_or_404(item_id)
        
        # Update nutrition values
        for field, value in data.items():
            if hasattr(item, field):
                setattr(item, field, value)
        
        db.session.commit()
        return jsonify({'message': 'Nutrition values updated successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg'}

# Error handlers
@app.errorhandler(404)
def not_found_error(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500

@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({'error': 'Rate limit exceeded'}), 429

@app.route('/test_analysis', methods=['POST'])
def test_analysis():
    try:
        # Check if files are in request
        if 'product_image' not in request.files or 'nutrition_image' not in request.files:
            return jsonify({
                'error': 'Missing files',
                'details': {
                    'product_image': 'product_image' in request.files,
                    'nutrition_image': 'nutrition_image' in request.files
                }
            }), 400

        product_image = request.files['product_image']
        nutrition_image = request.files['nutrition_image']

        # Check if files are empty
        if product_image.filename == '' or nutrition_image.filename == '':
            return jsonify({
                'error': 'No files selected',
                'details': {
                    'product_image': product_image.filename != '',
                    'nutrition_image': nutrition_image.filename != ''
                }
            }), 400

        try:
            # Read image data
            product_data = product_image.read()
            nutrition_data = nutrition_image.read()

            # Get product analysis
            product_response = analyze_image_with_gpt4(product_data)
            
            # Get nutrition analysis
            nutrition_response = analyze_image_with_gpt4(nutrition_data)

            # Return both responses
            return jsonify({
                'status': 'success',
                'product_analysis': product_response,
                'nutrition_analysis': nutrition_response,
                'model_used': 'gpt-4o'
            })

        except Exception as e:
            app.logger.error(f"Analysis failed: {str(e)}")
            return jsonify({
                'error': 'Analysis failed',
                'message': str(e),
                'type': type(e).__name__
            }), 500

    except Exception as e:
        app.logger.error(f"Server error: {str(e)}")
        return jsonify({
            'error': 'Server error',
            'message': str(e),
            'type': type(e).__name__
        }), 500

@app.route('/test')
def test_page():
    return render_template('test.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True) 