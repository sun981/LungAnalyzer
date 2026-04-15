export async function POST(request) {
  try {
    const { image, featureData } = await request.json();

    if (!image) {
      return Response.json({ error: 'No image provided' }, { status: 400 });
    }

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
        throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    let resultJson = {};

    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
        resultJson = JSON.parse(data.candidates[0].content.parts[0].text);
    } else {
        throw new Error("Invalid response format from Gemini");
    }

    return Response.json(resultJson);
  } catch (error) {
    console.error('Analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
