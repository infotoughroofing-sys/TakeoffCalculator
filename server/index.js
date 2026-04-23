const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an expert roofing and construction estimator with 30+ years of experience reading blueprints and performing material takeoffs.

When given a blueprint or set of plans, you:
1. Read every page carefully for dimensions, notes, and specifications
2. Calculate roof areas, pitches, linear footage, and square footage
3. Generate a comprehensive, job-ready material list

For EVERY roofing job, consider and include (when applicable):
- Roofing Squares (100 sq ft each): shingles, underlayment, ice & water shield
- Starter strips (linear feet along eaves)
- Ridge cap shingles (linear feet of ridge)
- Drip edge (linear feet of eaves + rakes)
- Step flashing, counter flashing, valley flashing (linear feet each)
- Pipe boots / vent collars (count each penetration)
- Roofing nails (lbs per square)
- Caulk / roofing sealant (tubes)
- Decking / sheathing (if replacement — sheets of plywood/OSB)
- Ridge vents (linear feet)
- Soffit vents (count)
- Gutters and downspouts (linear feet, count elbows)
- Gutter hangers and end caps
- Fascia boards (linear feet)
- Soffit material (sq ft)
- Skylights (note locations if present)
- Chimney flashing (linear feet if chimney present)
- Any special conditions noted on plans

Always add a 10% waste factor for shingles and underlayment.
Express shingle quantities in SQUARES (not individual bundles or sheets).
Always note the roof pitch found on the plans.
If dimensions are unclear, note your assumptions.

Output your response as structured JSON with this format:
{
  "projectSummary": {
    "totalRoofArea": "X squares",
    "roofPitch": "X/12",
    "numberOfSlopes": X,
    "notes": "any important observations from the plans"
  },
  "materials": [
    {
      "category": "category name",
      "items": [
        {
          "name": "material name",
          "quantity": "X units",
          "unit": "squares/lf/ea/sheets/lbs/tubes",
          "notes": "spec or brand recommendation"
        }
      ]
    }
  ],
  "warnings": ["any concerns or items needing clarification"]
}`;

app.post('/api/analyze', upload.single('blueprint'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const pdfBuffer = fs.readFileSync(req.file.path);
    const base64PDF = pdfBuffer.toString('base64');

    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64PDF,
              },
            },
            {
              type: 'text',
              text: 'Please read all pages of this blueprint carefully and generate a complete roofing material takeoff list. Include every item needed for this job.',
            },
          ],
        },
      ],
    });

    const text = response.content[0].text;

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Could not parse response', raw: text });
    }

    const result = JSON.parse(jsonMatch[0]);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    // Clean up uploaded file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Takeoff server running on port ${PORT}`));
