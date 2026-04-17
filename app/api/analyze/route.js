export async function POST(request) {
  try {
    const { image, featureData, engine } = await request.json();

    if (!image) {
      return Response.json({ error: 'No image provided' }, { status: 400 });
    }

    // ----------------------------------------------------
    // LOCAL AI (HuggingFace Python Backend) Route
    // ----------------------------------------------------
    if (engine === 'local') {
      console.log('Routing to Local Python AI at http://localhost:8000/predict');
      
      const localResponse = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: image }),
      });

      if (!localResponse.ok) {
        throw new Error(`Local Python API error: ${localResponse.statusText}`);
      }

      const localData = await localResponse.json();
      return Response.json(localData);
    }

    // ----------------------------------------------------
    // CLOUD AI (Gemini) Route (Default)
    // ----------------------------------------------------
    // Prepare features string
    let featureText = '';
    if (featureData) {
      featureText = `
ฟีเจอร์ทางคณิตศาสตร์จากระบบ Local Model:
- ขนาด (Area): ${featureData.area} px^2
- ความกลม (Circularity): ${parseFloat(featureData.circularity).toFixed(3)} (0-1 ยิ่งน้อยยิ่งขรุขระ เสี่ยงสูง)
- ความทึบ (Mean Density): ${parseFloat(featureData.meanDensity).toFixed(1)} intensity
- ความไม่สม่ำเสมอของเนื้อ (Heterogeneity/StdDev): ${parseFloat(featureData.stdDev).toFixed(2)} (ยิ่งสูงยิ่งเสี่ยง)
- โอกาสเป็นเนื้อร้ายจาก Local Logistic Regression: ${featureData.localProbability}%
      `;
    }

    // Call Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: `
คุณคือแพทย์รังสีแพทย์ผู้เชี่ยวชาญด้านมะเร็งปอด
จงวิเคราะห์ภาพ CT Scan ของก้อนเนื้อในปอด (Lung Nodule) ที่อาจมีการ Mask สีไว้ โดยพิจารณาจากภาพและข้อมูลทางคณิตศาสตร์ด้านล่างนี้:
${featureText}

ข้อมูลสำคัญ: 
- คุณต้องตอบกลับมาในรูปแบบ JSON ตาม Schema ที่กำหนดเท่านั้น
- ค่า classification อาจะตอบเป็นแค่ "Benign" หรือ "Malignant"
- คำอธิบายการวินิจฉัย (description) ต้องเป็น "ภาษาไทย" ล้วน และอธิบายถึงความเสี่ยงจากรูปทรงและความทึบ
- ค่า boundingBox จะเป็นพิกัด [ymin, xmin, ymax, xmax] ระหว่าง 0-1 ที่บอกตำแหน่งก้อนเนื้อ
            ` },
            { inline_data: { mime_type: "image/jpeg", data: image } }
          ]
        }],
        generationConfig: {
          response_mime_type: "application/json",
          response_schema: {
            type: "OBJECT",
            properties: {
              classification: {
                type: "STRING",
                description: "The classification: 'Benign' or 'Malignant'"
              },
              description: {
                type: "STRING",
                description: "Detailed description of the diagnosis in Thai language"
              },
              boundingBox: {
                type: "ARRAY",
                items: { type: "NUMBER" },
                description: "The [ymin, xmin, ymax, xmax] coordinates of the tumor mapped 0 to 1"
              }
            },
            required: ["classification", "description", "boundingBox"]
          }
        }
      })
    });

    if (!response.ok) {
        let errorMsg = `Gemini API error: ${response.statusText}`;
        try {
            const errorData = await response.json();
            errorMsg = `Gemini API error (${response.status}): ${JSON.stringify(errorData)}`;
        } catch (e) {
            // ignore parse error if response is not json
        }
        throw new Error(errorMsg);
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data.candidates || data.candidates.length === 0) {
        console.error('Gemini error response:', data);
        if (data.promptFeedback && data.promptFeedback.blockReason) {
          throw new Error(`Gemini blocked the request: ${data.promptFeedback.blockReason}`);
        }
        throw new Error("Gemini returned no candidates (possibly blocked by safety filters)");
    }

    const candidate = data.candidates[0];
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        throw new Error(`Gemini failed to finish normally: ${candidate.finishReason}`);
    }

    if (!candidate.content || !candidate.content.parts || !candidate.content.parts[0].text) {
        throw new Error("Invalid response content from Gemini");
    }

    let resultJson = {};
    try {
        resultJson = JSON.parse(candidate.content.parts[0].text);
    } catch (parseError) {
        console.error('Failed to parse Gemini output:', candidate.content.parts[0].text);
        throw new Error("Gemini output was not valid JSON");
    }

    return Response.json(resultJson);
  } catch (error) {
    console.error('SERVER ANALYSIS ERROR:', error);
    return Response.json({ 
        error: "Analysis Failed",
        details: error.message,
        suggestion: "กรุณาลองใหม่อีกครั้ง หรือสลับไปใช้ Local AI แทน"
    }, { status: 500 });
  }
}
