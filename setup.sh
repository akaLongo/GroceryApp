#!/bin/bash

# Create necessary directories
mkdir -p static/uploads
mkdir -p instance

# Set up virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Initialize the database
flask db upgrade

# Set proper permissions
chmod -R 755 static/uploads
chmod 755 instance

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    echo "OPENAI_API_KEY=your_key_here" > .env
    echo "FLASK_ENV=production" >> .env
    echo "Please update the OPENAI_API_KEY in .env file"
fi

# Create uploads directory if it doesn't exist
if [ ! -d "static/uploads" ]; then
    mkdir -p static/uploads
fi

echo "Setup complete! Next steps:"
echo "1. Update the OPENAI_API_KEY in .env file"
echo "2. Run the application with: python app.py"
echo "3. Access the application at http://localhost:5000" 