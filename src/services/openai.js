import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Enable browser usage
});

const parseOpenAIResponse = (content) => {
  try {
    // Remove any markdown formatting that might be present
    const cleanContent = content.replace(/```json\n?|\n?```/g, '');
    return JSON.parse(cleanContent);
  } catch (error) {
    throw new Error(`Failed to parse response as JSON. Raw response: ${content}`);
  }
};

export const analyzeProductImage = async (imageBase64) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this product image and respond ONLY with a JSON object in this exact format, with no additional text or formatting:\n{\"name\": \"Product Name\", \"description\": \"Brief product description\"}"
            },
            {
              type: "image_url",
              image_url: {
                url: imageBase64
              }
            }
          ]
        }
      ],
      max_tokens: 300
    });

    return parseOpenAIResponse(response.choices[0].message.content);
  } catch (error) {
    console.error('Error analyzing product image:', error);
    throw new Error(`Failed to analyze product image: ${error.message}`);
  }
};

export const analyzeNutritionLabel = async (imageBase64) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this nutrition label and respond ONLY with a JSON object in this exact format. Remove any 'g' or unit suffixes from the numbers and return them as plain numbers:\n{\"servingSize\": \"2.0 oz (56g)\", \"calories\": 200, \"protein\": 6, \"carbohydrates\": 39, \"fat\": 2.5, \"sugar\": 1}"
            },
            {
              type: "image_url",
              image_url: {
                url: imageBase64
              }
            }
          ]
        }
      ],
      max_tokens: 500
    });

    const result = parseOpenAIResponse(response.choices[0].message.content);
    
    // Ensure all numeric fields are numbers, not strings with units
    return {
      servingSize: result.servingSize,
      calories: Number(result.calories),
      protein: Number(String(result.protein).replace('g', '')),
      carbohydrates: Number(String(result.carbohydrates).replace('g', '')),
      fat: Number(String(result.fat).replace('g', '')),
      sugar: Number(String(result.sugar).replace('g', ''))
    };
  } catch (error) {
    console.error('Error analyzing nutrition label:', error);
    throw new Error(`Failed to analyze nutrition label: ${error.message}`);
  }
}; 