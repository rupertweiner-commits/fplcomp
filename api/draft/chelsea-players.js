import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Mock Chelsea players data for now
    // Later we'll integrate with FPL API or database
    const chelseaPlayers = [
      {
        id: 1,
        name: "Cole Palmer",
        position: "MID",
        team: "Chelsea",
        price: 5.6,
        points: 0,
        isAvailable: true
      },
      {
        id: 2,
        name: "Nicolas Jackson",
        position: "FWD",
        team: "Chelsea",
        price: 7.0,
        points: 0,
        isAvailable: true
      },
      {
        id: 3,
        name: "Raheem Sterling",
        position: "MID",
        team: "Chelsea",
        price: 6.8,
        points: 0,
        isAvailable: true
      },
      {
        id: 4,
        name: "Enzo Fernández",
        position: "MID",
        team: "Chelsea",
        price: 5.0,
        points: 0,
        isAvailable: true
      },
      {
        id: 5,
        name: "Moisés Caicedo",
        position: "MID",
        team: "Chelsea",
        price: 4.5,
        points: 0,
        isAvailable: true
      }
    ];

    res.json({
      success: true,
      data: chelseaPlayers
    });

  } catch (error) {
    console.error('Chelsea players error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Chelsea players'
    });
  }
}



