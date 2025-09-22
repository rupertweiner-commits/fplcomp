import React, { useState, useEffect, useRef } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { TrendingUp, BarChart3, Users, Calendar, Trophy, Eye, EyeOff } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function LeaderboardVisualizations({ leaderboardData, currentUser }) {
  const [selectedGameweek, setSelectedGameweek] = useState(null);
  const [gameweekBreakdown, setGameweekBreakdown] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState('cumulative'); // 'cumulative', 'gameweek', 'comparison'
  const [visibleUsers, setVisibleUsers] = useState({});
  const [cumulativeData, setCumulativeData] = useState(null);
  const [loadingCumulative, setLoadingCumulative] = useState(false);
  const chartRef = useRef(null);

  // Initialize visible users (all visible by default)
  useEffect(() => {
    if (leaderboardData?.leaderboard) {
      const initialVisible = {};
      leaderboardData.leaderboard.forEach(user => {
        initialVisible[user.user_id] = true;
      });
      setVisibleUsers(initialVisible);
    }
  }, [leaderboardData]);

  // Fetch cumulative data when component mounts
  useEffect(() => {
    fetchCumulativeData();
  }, []);

  const fetchCumulativeData = async () => {
    setLoadingCumulative(true);
    try {
      console.log('📈 Fetching cumulative data for charts...');
      const response = await fetch('/api/players?action=get-cumulative-data');
      const data = await response.json();
      
      console.log('📈 Cumulative data response:', data);
      
      if (data.success) {
        setCumulativeData(data.data);
        console.log('✅ Cumulative data loaded:', data.data?.length, 'users');
      } else {
        console.error('❌ Failed to fetch cumulative data:', data.error);
        // Fallback to mock data for now
        setCumulativeData([]);
      }
    } catch (error) {
      console.error('❌ Error fetching cumulative data:', error);
      // Fallback to mock data for now
      setCumulativeData([]);
    } finally {
      setLoadingCumulative(false);
    }
  };

  // Color palette for different users
  const userColors = [
    { bg: 'rgba(255, 99, 132, 0.2)', border: 'rgb(255, 99, 132)', name: 'Rose' },
    { bg: 'rgba(54, 162, 235, 0.2)', border: 'rgb(54, 162, 235)', name: 'Blue' },
    { bg: 'rgba(255, 205, 86, 0.2)', border: 'rgb(255, 205, 86)', name: 'Yellow' },
    { bg: 'rgba(75, 192, 192, 0.2)', border: 'rgb(75, 192, 192)', name: 'Teal' },
    { bg: 'rgba(153, 102, 255, 0.2)', border: 'rgb(153, 102, 255)', name: 'Purple' },
    { bg: 'rgba(255, 159, 64, 0.2)', border: 'rgb(255, 159, 64)', name: 'Orange' }
  ];

  // Generate cumulative data from API response
  const generateCumulativeData = () => {
    if (loadingCumulative) return { labels: [], datasets: [] };

    const gameweeks = Array.from({ length: 5 }, (_, i) => `GW${i + 1}`);
    
    // If no cumulative data, create mock data from leaderboard
    if (!cumulativeData || cumulativeData.length === 0) {
      console.log('📈 Using mock cumulative data from leaderboard');
      
      if (!leaderboardData?.leaderboard) return { labels: [], datasets: [] };
      
      const datasets = leaderboardData.leaderboard
        .filter(user => visibleUsers[user.user_id])
        .map((user, index) => {
          const color = userColors[index % userColors.length];
          
          // Mock progressive points (0, 0, 0, partial, full)
          const competitionPoints = user.competition_points_with_multiplier || 0;
          const mockProgression = [0, 0, 0, Math.floor(competitionPoints * 0.6), competitionPoints];

          return {
            label: user.first_name || user.email,
            data: mockProgression,
            borderColor: color.border,
            backgroundColor: color.bg,
            borderWidth: 3,
            pointRadius: 6,
            pointHoverRadius: 8,
            tension: 0.4,
            fill: false
          };
        });

      return { labels: gameweeks, datasets };
    }

    const visibleUserData = cumulativeData.filter(user => 
      leaderboardData?.leaderboard?.some(lbUser => 
        lbUser.user_id === user.user_id && visibleUsers[user.user_id]
      )
    );

    const datasets = visibleUserData.map((user, index) => {
      const color = userColors[index % userColors.length];
      
      // Extract cumulative points for each gameweek
      const cumulativePoints = user.gameweeks.map(gw => gw.cumulative);

      return {
        label: user.user_name,
        data: cumulativePoints,
        borderColor: color.border,
        backgroundColor: color.bg,
        borderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.4,
        fill: false
      };
    });

    return {
      labels: gameweeks,
      datasets
    };
  };

  // Fetch gameweek breakdown when a point is clicked
  const fetchGameweekBreakdown = async (gameweek) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/players?action=get-gameweek-breakdown&gameweek=${gameweek}`);
      const data = await response.json();
      
      if (data.success) {
        setGameweekBreakdown(data.breakdown);
      } else {
        console.error('Failed to fetch gameweek breakdown:', data.error);
        setGameweekBreakdown([]);
      }
    } catch (error) {
      console.error('Error fetching gameweek breakdown:', error);
      setGameweekBreakdown([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle chart click events
  const handleChartClick = (event, elements) => {
    if (elements.length > 0) {
      const elementIndex = elements[0].index;
      const gameweek = elementIndex + 1;
      setSelectedGameweek(gameweek);
      fetchGameweekBreakdown(gameweek);
    }
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: handleChartClick,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20
        }
      },
      title: {
        display: true,
        text: 'Cumulative Competition Points by Gameweek',
        font: {
          size: 18,
          weight: 'bold'
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y} pts`;
          },
          afterLabel: function(context) {
            if (context.dataIndex >= 3) { // GW4+
              return 'Click to see breakdown';
            }
            return 'Pre-competition (excluded)';
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Gameweek'
        },
        grid: {
          drawOnChartArea: false
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Competition Points'
        },
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  // Generate gameweek comparison chart
  const generateGameweekComparisonData = () => {
    if (!gameweekBreakdown) return { labels: [], datasets: [] };

    const userNames = gameweekBreakdown.map(user => user.user_name);
    const totalPoints = gameweekBreakdown.map(user => user.total_points);

    return {
      labels: userNames,
      datasets: [{
        label: `GW${selectedGameweek} Points`,
        data: totalPoints,
        backgroundColor: userColors.slice(0, userNames.length).map(color => color.bg),
        borderColor: userColors.slice(0, userNames.length).map(color => color.border),
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false
      }]
    };
  };

  // Toggle user visibility
  const toggleUserVisibility = (userId) => {
    setVisibleUsers(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  if (!leaderboardData?.leaderboard) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No leaderboard data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveView('cumulative')}
            className={`flex items-center px-4 py-2 rounded-lg font-medium ${
              activeView === 'cumulative'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Cumulative
          </button>
          <button
            onClick={() => setActiveView('comparison')}
            className={`flex items-center px-4 py-2 rounded-lg font-medium ${
              activeView === 'comparison'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Compare
          </button>
        </div>

        {/* User Visibility Controls */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Show:</span>
          {leaderboardData.leaderboard.map((user, index) => {
            const color = userColors[index % userColors.length];
            return (
              <button
                key={user.user_id}
                onClick={() => toggleUserVisibility(user.user_id)}
                className={`flex items-center px-3 py-1 rounded-full text-xs font-medium border-2 ${
                  visibleUsers[user.user_id]
                    ? 'border-opacity-100'
                    : 'border-opacity-30 opacity-50'
                }`}
                style={{
                  borderColor: color.border,
                  backgroundColor: visibleUsers[user.user_id] ? color.bg : 'transparent'
                }}
              >
                {visibleUsers[user.user_id] ? (
                  <Eye className="w-3 h-3 mr-1" />
                ) : (
                  <EyeOff className="w-3 h-3 mr-1" />
                )}
                {user.first_name || user.email}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        {activeView === 'cumulative' && (
          <div className="h-96">
            <Line
              ref={chartRef}
              data={generateCumulativeData()}
              options={chartOptions}
            />
          </div>
        )}

        {activeView === 'comparison' && selectedGameweek && gameweekBreakdown && (
          <div className="h-96">
            <Bar
              data={generateGameweekComparisonData()}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  },
                  title: {
                    display: true,
                    text: `Gameweek ${selectedGameweek} Comparison`,
                    font: {
                      size: 18,
                      weight: 'bold'
                    }
                  },
                  tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white'
                  }
                },
                scales: {
                  x: {
                    title: {
                      display: true,
                      text: 'Users'
                    }
                  },
                  y: {
                    title: {
                      display: true,
                      text: 'Points'
                    },
                    beginAtZero: true
                  }
                }
              }}
            />
          </div>
        )}

        {activeView === 'comparison' && !selectedGameweek && (
          <div className="h-96 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Click on a gameweek point</p>
              <p className="text-sm">Switch to Cumulative view and click on any point to see gameweek breakdown</p>
            </div>
          </div>
        )}
      </div>

      {/* Gameweek Breakdown Panel */}
      {selectedGameweek && gameweekBreakdown && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <Trophy className="w-6 h-6 mr-2 text-yellow-500" />
              Gameweek {selectedGameweek} Breakdown
            </h3>
            <button
              onClick={() => {
                setSelectedGameweek(null);
                setGameweekBreakdown(null);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {gameweekBreakdown.map((user, index) => {
              const color = userColors[index % userColors.length];
              return (
                <div
                  key={user.user_id}
                  className="border rounded-lg p-4"
                  style={{ borderColor: color.border }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-lg">{user.user_name}</h4>
                    <span className="text-xl font-bold" style={{ color: color.border }}>
                      {user.total_points} pts
                    </span>
                  </div>
                  
                      <div className="space-y-2">
                    {user.players.map((player, playerIndex) => (
                      <div
                        key={playerIndex}
                        className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded"
                      >
                        <div className="flex items-center">
                          <span className="font-medium">{player.name}</span>
                          {player.is_captain && (
                            <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                              C
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">
                            {player.final_points || (player.is_captain ? player.points * 2 : player.points)} pts
                          </span>
                          {player.is_captain && (
                            <span className="text-xs text-gray-500 block">
                              ({player.points} × 2)
                            </span>
                          )}
                          {player.goals_scored > 0 && (
                            <span className="text-xs text-green-600 block">
                              ⚽ {player.goals_scored}
                            </span>
                          )}
                          {player.assists > 0 && (
                            <span className="text-xs text-blue-600 block">
                              🅰️ {player.assists}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span>Loading gameweek breakdown...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeaderboardVisualizations;
