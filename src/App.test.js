import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

// Mock the OpenAI service
jest.mock('./services/openai', () => ({
  analyzeProductImage: jest.fn(),
  analyzeNutritionLabel: jest.fn(),
}));

describe('App Component', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  test('renders grocery cart tracker title', () => {
    render(<App />);
    const titleElement = screen.getByText(/Grocery Cart Tracker/i);
    expect(titleElement).toBeInTheDocument();
  });

  test('renders add item button', () => {
    render(<App />);
    const addButton = screen.getByText(/Add Item/i);
    expect(addButton).toBeInTheDocument();
  });

  test('opens add item dialog when clicking add button', () => {
    render(<App />);
    const addButton = screen.getByText(/Add Item/i);
    fireEvent.click(addButton);
    
    // Check if dialog elements are present
    expect(screen.getByText(/Add New Item/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Item Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Quantity/i)).toBeInTheDocument();
  });

  test('calculates total correctly', () => {
    render(<App />);
    
    // Add an item
    const addButton = screen.getByText(/Add Item/i);
    fireEvent.click(addButton);
    
    // Fill in the form
    fireEvent.change(screen.getByLabelText(/Item Name/i), { target: { value: 'Test Item' } });
    fireEvent.change(screen.getByLabelText(/Price/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/Quantity/i), { target: { value: '2' } });
    
    // Submit the form (use a more specific selector)
    const submitButton = screen.getByRole('button', { name: /Add$/i });
    fireEvent.click(submitButton);
    
    // Check if total is calculated correctly (10 * 2 = 20)
    expect(screen.getByText(/Total: \$20.00/i)).toBeInTheDocument();
  });

  test('handles product image analysis', async () => {
    // Mock the product analysis response
    const mockProductAnalysis = {
      name: 'Test Product',
      description: 'A test product description'
    };
    require('./services/openai').analyzeProductImage.mockResolvedValue(mockProductAnalysis);

    render(<App />);
    
    // Open the add item dialog
    const addButton = screen.getByText(/Add Item/i);
    fireEvent.click(addButton);
    
    // Find the file input for product photo
    const productPhotoInput = screen.getByLabelText(/Upload Photo/i, { selector: 'input[type="file"]' });
    
    // Create a mock file and trigger the change event
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    Object.defineProperty(productPhotoInput, 'files', {
      value: [file]
    });
    fireEvent.change(productPhotoInput);
    
    // Wait for the analysis to complete and check the results
    await waitFor(() => {
      expect(screen.getByDisplayValue(mockProductAnalysis.name)).toBeInTheDocument();
      expect(screen.getByText(mockProductAnalysis.description)).toBeInTheDocument();
    });
  });

  test('handles nutrition label analysis', async () => {
    // Mock the nutrition analysis response
    const mockNutritionAnalysis = {
      servingSize: '100g',
      calories: '200',
      protein: '10',
      carbohydrates: '20',
      fat: '5'
    };
    require('./services/openai').analyzeNutritionLabel.mockResolvedValue(mockNutritionAnalysis);

    render(<App />);
    
    // Open the add item dialog
    const addButton = screen.getByText(/Add Item/i);
    fireEvent.click(addButton);
    
    // Find the file input for nutrition label
    const nutritionLabelInput = screen.getAllByLabelText(/Upload Photo/i, { selector: 'input[type="file"]' })[1];
    
    // Create a mock file and trigger the change event
    const file = new File(['test'], 'nutrition.png', { type: 'image/png' });
    Object.defineProperty(nutritionLabelInput, 'files', {
      value: [file]
    });
    fireEvent.change(nutritionLabelInput);
    
    // Wait for the analysis to complete
    await waitFor(() => {
      expect(screen.getByText(`Serving Size: ${mockNutritionAnalysis.servingSize}`)).toBeInTheDocument();
      expect(screen.getByText(`Calories: ${mockNutritionAnalysis.calories}`)).toBeInTheDocument();
      expect(screen.getByText(`Protein: ${mockNutritionAnalysis.protein}g`)).toBeInTheDocument();
      expect(screen.getByText(`Carbs: ${mockNutritionAnalysis.carbohydrates}g`)).toBeInTheDocument();
      expect(screen.getByText(`Fat: ${mockNutritionAnalysis.fat}g`)).toBeInTheDocument();
    });
  });

  test('handles errors during image analysis', async () => {
    // Mock the product analysis to throw an error
    require('./services/openai').analyzeProductImage.mockRejectedValue(new Error('Analysis failed'));

    render(<App />);
    
    // Open the add item dialog
    const addButton = screen.getByText(/Add Item/i);
    fireEvent.click(addButton);
    
    // Find the file input for product photo
    const productPhotoInput = screen.getByLabelText(/Upload Photo/i, { selector: 'input[type="file"]' });
    
    // Create a mock file and trigger the change event
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    Object.defineProperty(productPhotoInput, 'files', {
      value: [file]
    });
    fireEvent.change(productPhotoInput);
    
    // Wait for the error message to appear
    await waitFor(() => {
      expect(screen.getByText(/Failed to analyze product image/i)).toBeInTheDocument();
    });
  });
}); 