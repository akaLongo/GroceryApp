// Function to load and display nutrition data
async function loadNutritionData() {
    try {
        const response = await fetch('/api/items');
        if (!response.ok) throw new Error('Failed to load items');
        const items = await response.json();

        // Calculate totals
        const totals = items.reduce((acc, item) => {
            const quantity = parseInt(item.quantity) || 1;
            return {
                calories: acc.calories + (parseFloat(item.calories) || 0) * quantity,
                protein: acc.protein + (parseFloat(item.protein) || 0) * quantity,
                carbs: acc.carbs + (parseFloat(item.carbs) || 0) * quantity,
                fat: acc.fat + (parseFloat(item.fat) || 0) * quantity,
                fiber: acc.fiber + (parseFloat(item.fiber) || 0) * quantity,
                sugar: acc.sugar + (parseFloat(item.sugar) || 0) * quantity,
                sodium: acc.sodium + (parseFloat(item.sodium) || 0) * quantity,
                cholesterol: acc.cholesterol + (parseFloat(item.cholesterol) || 0) * quantity
            };
        }, {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0,
            sodium: 0,
            cholesterol: 0
        });

        // Update summary values
        document.getElementById('totalCalories').textContent = Math.round(totals.calories);
        document.getElementById('totalProtein').textContent = totals.protein.toFixed(1) + 'g';
        document.getElementById('totalCarbs').textContent = totals.carbs.toFixed(1) + 'g';
        document.getElementById('totalFat').textContent = totals.fat.toFixed(1) + 'g';
        document.getElementById('totalFiber').textContent = totals.fiber.toFixed(1) + 'g';
        document.getElementById('totalSugar').textContent = totals.sugar.toFixed(1) + 'g';
        document.getElementById('totalSodium').textContent = totals.sodium.toFixed(1) + 'mg';
        document.getElementById('totalCholesterol').textContent = totals.cholesterol.toFixed(1) + 'mg';

        // Render items list
        const itemsList = document.getElementById('nutrition-items-list');
        itemsList.innerHTML = items.map(item => `
            <div class="nutrition-item">
                <div class="item-header">
                    <img src="/static/uploads/${item.product_image}" alt="${item.name}" class="item-image">
                    <div class="item-info">
                        <h3>${item.name}</h3>
                        <p>Quantity: ${item.quantity}</p>
                    </div>
                </div>
                <div class="item-nutrition">
                    <div class="nutrition-grid">
                        <div class="nutrition-value">
                            <span class="label">Calories:</span>
                            <span class="value">${item.calories !== null ? item.calories : 'N/A'}</span>
                        </div>
                        <div class="nutrition-value">
                            <span class="label">Protein:</span>
                            <span class="value">${item.protein !== null ? item.protein + 'g' : 'N/A'}</span>
                        </div>
                        <div class="nutrition-value">
                            <span class="label">Carbs:</span>
                            <span class="value">${item.carbs !== null ? item.carbs + 'g' : 'N/A'}</span>
                        </div>
                        <div class="nutrition-value">
                            <span class="label">Fat:</span>
                            <span class="value">${item.fat !== null ? item.fat + 'g' : 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading nutrition data:', error);
    }
}

// Load nutrition data when page loads
document.addEventListener('DOMContentLoaded', loadNutritionData); 