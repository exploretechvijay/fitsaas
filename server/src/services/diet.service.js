import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config/index.js';
import { supabaseAdmin } from '../config/supabase.js';
import ApiError from '../utils/ApiError.js';

class DietService {
  async getGeminiModel(gymId) {
    // Try gym-level key first, then fall back to platform .env key
    let apiKey = config.gemini.apiKey;

    if (gymId) {
      const { data: gym } = await supabaseAdmin
        .from('tenants')
        .select('gemini_api_key')
        .eq('gym_id', gymId)
        .single();
      if (gym?.gemini_api_key) {
        apiKey = gym.gemini_api_key;
      }
    }

    if (!apiKey || apiKey === 'your-gemini-api-key') {
      throw ApiError.badRequest('Gemini API key is not configured. Please add it in Settings.');
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  async generateDietPlan(gymId, data) {
    const model = await this.getGeminiModel(gymId);

    const dietPrefLabel = {
      veg: 'Pure Vegetarian (no eggs, no meat, no fish)',
      non_veg: 'Non-Vegetarian (chicken, fish, eggs, mutton allowed)',
      vegan: 'Vegan (no dairy, no eggs, no meat - plant-based only)',
      eggetarian: 'Eggetarian (vegetarian + eggs allowed, no meat/fish)',
    };

    const goalLabel = {
      weight_loss: 'Weight Loss (calorie deficit, high protein)',
      muscle_gain: 'Muscle Gain (calorie surplus, very high protein)',
      endurance: 'Endurance & Stamina (balanced macros, complex carbs)',
      flexibility: 'Flexibility & Recovery (anti-inflammatory foods)',
      general_fitness: 'General Fitness & Health (balanced nutrition)',
    };

    const prompt = `You are an experienced Indian sports nutritionist. Create a practical 7-day Indian diet plan.

Member: ${data.weight}kg, ${data.height}cm, ${data.age} years old
Goal: ${goalLabel[data.goal] || data.goal}
Diet: ${dietPrefLabel[data.dietary_pref] || data.dietary_pref}

IMPORTANT RULES:
- Use ONLY Indian foods and meals (roti, rice, dal, sabzi, paratha, poha, upma, idli, dosa, paneer, curd, lassi, buttermilk, sprouts, chana, rajma, etc.)
- Use simple everyday Indian meal names in English (e.g. "Paneer Bhurji with Roti" not fancy names)
- Include common Indian items: dal, chapati, rice, sabzi, raita, salad, buttermilk, fruits
- For non-veg: include chicken curry, egg bhurji, fish fry, keema — cooked Indian style
- Portions in Indian measurements (1 katori, 2 roti, 1 bowl, 1 glass, 1 plate)
- Keep meals realistic - what a normal Indian family would cook
- Pre/post workout can be simple: banana, dry fruits, protein shake, sprout chaat

Return ONLY valid JSON (no markdown, no backticks):
{
  "days": [
    {
      "day": 1,
      "day_name": "Monday",
      "meals": {
        "breakfast": { "name": "Meal name", "items": ["item - portion", "item - portion"], "calories": 400, "protein_g": 30, "carbs_g": 45, "fat_g": 12 },
        "morning_snack": { "name": "...", "items": ["..."], "calories": 150, "protein_g": 8, "carbs_g": 20, "fat_g": 5 },
        "lunch": { "name": "...", "items": ["..."], "calories": 500, "protein_g": 25, "carbs_g": 60, "fat_g": 15 },
        "afternoon_snack": { "name": "...", "items": ["..."], "calories": 150, "protein_g": 5, "carbs_g": 15, "fat_g": 8 },
        "pre_workout": { "name": "...", "items": ["..."], "calories": 100, "protein_g": 3, "carbs_g": 20, "fat_g": 1 },
        "post_workout": { "name": "...", "items": ["..."], "calories": 150, "protein_g": 20, "carbs_g": 10, "fat_g": 3 },
        "dinner": { "name": "...", "items": ["..."], "calories": 450, "protein_g": 25, "carbs_g": 50, "fat_g": 12 }
      },
      "daily_totals": { "calories": 1900, "protein_g": 116, "carbs_g": 220, "fat_g": 56 }
    }
  ],
  "notes": "Short practical advice in simple language"
}`;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw ApiError.internal('AI generated an invalid response. Please try again.');
      }

      const weekData = JSON.parse(jsonMatch[0]);
      return weekData;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw ApiError.internal('Failed to generate diet plan: ' + err.message);
    }
  }

  async saveDietPlan(gymId, data) {
    const { data: plan, error } = await supabaseAdmin
      .from('diet_plans')
      .insert({
        diet_id: uuidv4(),
        member_id: data.member_id,
        gym_id: gymId,
        source: data.source,
        week_data: data.week_data,
      })
      .select()
      .single();

    if (error) throw ApiError.internal('Failed to save diet plan: ' + error.message);
    return plan;
  }

  async updateDietPlan(gymId, dietId, data) {
    const { data: plan, error } = await supabaseAdmin
      .from('diet_plans')
      .update({ week_data: data.week_data })
      .eq('gym_id', gymId)
      .eq('diet_id', dietId)
      .select()
      .single();

    if (error) throw ApiError.internal('Failed to update diet plan: ' + error.message);
    if (!plan) throw ApiError.notFound('Diet plan not found');
    return plan;
  }

  async getMemberDietPlans(gymId, memberId) {
    const { data, error } = await supabaseAdmin
      .from('diet_plans')
      .select('*')
      .eq('gym_id', gymId)
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });

    if (error) throw ApiError.internal('Failed to fetch diet plans');
    return data || [];
  }

  async getDietPlanById(dietId) {
    const { data, error } = await supabaseAdmin
      .from('diet_plans')
      .select('*, members(full_name, goal, dietary_pref)')
      .eq('diet_id', dietId)
      .single();

    if (error || !data) throw ApiError.notFound('Diet plan not found');
    return data;
  }

  async deleteDietPlan(gymId, dietId) {
    const { error } = await supabaseAdmin
      .from('diet_plans')
      .delete()
      .eq('gym_id', gymId)
      .eq('diet_id', dietId);

    if (error) throw ApiError.internal('Failed to delete diet plan');
  }
}

export default new DietService();
