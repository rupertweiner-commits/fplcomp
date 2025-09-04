import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get simulation status from database
    const { data: simulationStatus, error } = await supabase
      .from('simulation_status')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // If no simulation status exists, create default
    if (!simulationStatus) {
      const { data: newStatus, error: createError } = await supabase
        .from('simulation_status')
        .insert({
          current_gameweek: 1,
          is_simulation_mode: false,
          is_draft_complete: false,
          total_gameweeks: 38,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      return res.status(200).json({ 
        success: true,
        data: newStatus 
      });
    }

    res.status(200).json({ 
      success: true,
      data: simulationStatus 
    });

  } catch (error) {
    console.error('Failed to fetch simulation status:', error);
    res.status(500).json({ 
      error: 'Failed to fetch simulation status',
      details: error.message 
    });
  }
}
