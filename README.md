# Smart Grocery Cart Tracker

A mobile-friendly web application that helps you track your grocery spending and nutritional information in real-time while shopping.

## Features

- 📱 Mobile-optimized interface for easy in-store use
- 📸 Snap photos of products and nutrition labels
- 🤖 AI-powered nutrition label analysis
- 💰 Real-time cost tracking
- 📊 Nutritional information tracking
- 🔄 Easy item management and updates

## Setup Instructions

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- A modern web browser
- OpenAI API key for GPT-4 Vision

### Installation

1. Clone the repository:
```bash
git clone <your-repository-url>
cd grocery_app
```

2. Create a virtual environment:
```bash
python -m venv venv
```

3. Activate the virtual environment:
- Windows:
```bash
venv\Scripts\activate
```
- macOS/Linux:
```bash
source venv/bin/activate
```

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Create a `.env` file in the root directory and add your OpenAI API key:
```
OPENAI_API_KEY=your_api_key_here
```

6. Initialize the database:
```bash
flask db upgrade
```

### Running the Application

1. Start the Flask server:
```bash
python app.py
```

2. Access the application:
- Local development: Visit `http://127.0.0.1:5000`
- On your phone: Use your computer's local IP address (e.g., `http://192.168.1.100:5000`)

## Mobile Usage Guide

1. **Using WiFi**:
   - Connect your phone to the same WiFi network as your computer
   - Find your computer's IP address:
     - Windows: Run `ipconfig` in Command Prompt
     - macOS/Linux: Run `ifconfig` in Terminal
   - Access the app using your computer's IP address and port 5000

2. **Using Cellular Data (Mobile Hotspot)**:
   - Enable mobile hotspot on your phone
   - Connect your computer to your phone's hotspot
   - Start the Flask application
   - Find your computer's IP address (usually starts with 192.168)
   - Access the app on your phone using that IP address
   - Add to home screen for quick access

3. **Add to Home Screen**:
   - iOS: Use Safari's "Add to Home Screen" option
   - Android: Use Chrome's "Add to Home Screen" option

### Mobile Data Usage Tips

- Images are compressed before upload to reduce data usage
- Consider pre-loading the app on WiFi before heading to the store
- The app caches previous items to reduce data usage
- Nutrition label analysis requires an internet connection
- Estimated data usage per item: 0.5-2MB depending on image quality

### Mobile Battery Tips

- Reduce screen brightness when possible
- Close other apps running in background
- Keep your hotspot connection close to minimize power usage
- Consider bringing a power bank for longer shopping trips

## Security Considerations

- This application is designed for personal use on trusted networks
- Always use HTTPS in production environments
- Keep your OpenAI API key secure
- Regularly update dependencies

## Troubleshooting

### Common Issues

1. **Can't access on phone**:
   - Ensure phone and computer are on same network
   - Check firewall settings
   - Verify correct IP address and port

2. **Images not uploading**:
   - Check file size limits
   - Ensure proper permissions on upload directory
   - Verify supported image formats

3. **Nutrition analysis not working**:
   - Verify OpenAI API key is correct
   - Check internet connection
   - Ensure clear, readable nutrition label images

## Future Enhancements

- [ ] Offline support
- [ ] Shopping list creation
- [ ] Receipt scanning
- [ ] Multiple cart support
- [ ] Export data functionality
- [ ] Budget tracking
- [ ] Meal planning integration

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

- **Smart Item Recognition**: Upload photos of products and nutrition labels for automatic information extraction using GPT-4 Vision
- **Comprehensive Nutrition Tracking**: Track detailed nutritional information including:
  - Basic Macros (Calories, Protein, Carbs, Fat)
  - Sugars and Fiber
  - Vitamins and Minerals
  - Sodium and Cholesterol
  - Detailed Fat Breakdown

- **Dynamic Totals**: Real-time calculation of total nutrition values across all items
- **Customizable Display**: Toggle which nutritional information to display
- 
- **AI Meal Planning**: Get intelligent meal suggestions based on your grocery items
- **Modern UI**: Clean, responsive interface with easy-to-read nutritional cards

## Setup

1. **Clone the Repository**
   ```bash
   git clone [repository-url]
   cd grocery_app
   ```

2. **Set Up Python Environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Environment Variables**
   Create a `.env` file in the project root:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

4. **Initialize the Database**
   ```bash
   flask db init
   flask db migrate
   flask db upgrade
   ```

5. **Run the Application**
   ```bash
   python app.py
   ```
   The application will be available at `http://127.0.0.1:5000`

## Usage

### Adding Items
1. Click the "+" button to add a new item
2. Upload a photo of the product (optional)
3. Upload a photo of the nutrition label (optional)
4. The AI will automatically extract product information and nutritional data
5. Review and confirm the information

### Managing Items
- **Delete**: Click the trash icon on any item card
- **View Details**: Click on an item to see full nutritional information
- **Toggle Display**: Use the settings menu to customize which nutritional information is shown

### Meal Planning
1. Add several items to your grocery list
2. Click the "Generate Meal Plan" button
3. Get AI-generated meal suggestions based on your available items
4. Suggestions are categorized into Breakfast, Lunch, Dinner, and Snacks

### Barcode Scanning
1. Click the barcode icon
2. Scan a product barcode
3. Review the product information from the Open Food Facts database
4. Confirm to add the item to your list

## Technical Details

- **Backend**: Flask (Python)
- **Database**: SQLite with SQLAlchemy
- **AI Features**: OpenAI GPT-4 Turbo API
- **Product Database**: Open Food Facts API
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)

## Dependencies

- Flask
- SQLAlchemy
- Flask-Migrate
- OpenAI Python Client
- Pillow (PIL)
- python-dotenv
- requests
- Flask-CORS

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 