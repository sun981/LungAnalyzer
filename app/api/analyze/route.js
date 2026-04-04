import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const payload = await request.json();
    const { imageBase64, mimeType, features } = payload;

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured in .env.local" }, { status: 500 });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    const promptText = `
    You are an expert diagnostic radiologist. Analyze the provided radiological image.
    If the image has a green contour and pink overlay, that is the user's manual segmentation of the tumor. 
    If it is a raw medical scan (no overlays), you must carefully locate the suspicious mass yourself.
    
    The user's workstation extracted the following geometric data from the target mass:
    - Estimated Mass Size: ${features?.size || 0} pixels
    - Edge Irregularity Score: ${features?.irregularity || 1.0} (1.0 = smooth border. Higher scores indicate spiculated/jagged margins).
    
    Identify the suspicious region in the image and return its bounding box coordinates accurately normalized from 0 to 1000 ([ymin, xmin, ymax, xmax]), where 0,0 is the top-left and 1000,1000 is the bottom-right.
    
    Using BOTH the visual appearance of the image and the extracted geometric features above, classify the primary mass as either "Benign" or "Malignant".
    
    CRITICAL INSTRUCTION: The "description" field MUST be written in Thai language (ภาษาไทย) and should clearly explain why it is classified as such. All other JSON keys MUST be exactly as specified in English.
    
    Return the response as valid JSON ONLY, using this schema:
    {
      "classifications": [
        {
          "label": "string (MUST be either 'Benign' or 'Malignant' or 'Inconclusive')",
          "probability": number (0-100 percentage integer representing confidence),
          "description": "string (Detailed explanation of the diagnosis based on visual features and the provided Edge Irregularity score)",
          "boundingBox": {
            "ymin": number (0 to 1000),
            "xmin": number (0 to 1000),
            "ymax": number (0 to 1000),
            "xmax": number (0 to 1000)
          }
        }
      ]
    }
    
    You may include secondary differential diagnoses as additional objects in the array if the image is ambiguous.
    Do not include markdown blocks like \`\`\`json.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [
            { text: promptText },
            { inlineData: { data: imageBase64, mimeType: mimeType || 'image/jpeg' } }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const jsonText = response.text;
    const data = JSON.parse(jsonText);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process image/data" }, { status: 500 });
  }
}
