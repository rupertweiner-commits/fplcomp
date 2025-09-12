import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  LineChart,
  Target,
  Award,
  Activity,
  Calendar,
  Users,
  Zap
} from 'lucide-react';

function GameweekAnalytics({ currentUser, season = '2024-25' }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('all'); // 'all', 'last5', 'last10'

  useEffect(() => {
    if (currentUser?.id) {
      fetchAnalytics();
    }
  }, [currentUser?.id, season, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/gameweek-scores?action=get-user-history&userId=${currentUser.id}&season=${season}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch analytics data');
      }

      // Process analytics data
      const processedAnalytics = processAnalyticsData(data.data, timeRange);
      setAnalytics(processedAnalytics);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (data, range) => {
    if (!data.scores || data.scores.length === 0) return null;

    let scores = data.scores;
    
    // Filter by time range
    if (range === 'last5') {
      scores = scores.slice(-5);
    } else if (range === 'last10') {
      scores = scores.slice(-10);
    }

    const totalPoints = scores.reduce((sum, score) => sum + (score.total_points || 0), 0);
    const averageScore = totalPoints / scores.length;
    const bestScore = Math.max(...scores.map(s => s.total_points || 0));
    const worstScore = Math.min(...scores.map(s => s.total_points || 0));
    
    // Calculate trends
    const scoreChanges = [];
    for (let i = 1; i < scores.length; i++) {
      scoreChanges.push(scores[i].total_points - scores[i-1].total_points);
    }
    
    const averageChange = scoreChanges.length > 0 
      ? scoreChanges.reduce((sum, change) => sum + change, 0) / scoreChanges.length 
      : 0;
    
    const positiveWeeks = scoreChanges.filter(change => change > 0).length;
    const negativeWeeks = scoreChanges.filter(change => change < 0).length;
    const neutralWeeks = scoreChanges.filter(change => change === 0).length;

    // Calculate consistency (lower variance = more consistent)
    const variance = scores.reduce((sum, score) => {
      return sum + Math.pow(score.total_points - averageScore, 2);
    }, 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    const consistency = Math.max(0, 100 - (standardDeviation / averageScore * 100));

    // Calculate form (last 3 gameweeks average)
    const last3Scores = scores.slice(-3);
    const form = last3Scores.length > 0 
      ? last3Scores.reduce((sum, score) => sum + score.total_points, 0) / last3Scores.length 
      : 0;

    // Calculate captain performance
    const captainPoints = scores.reduce((sum, score) => sum + (score.captain_points || 0), 0);
    const captainContribution = totalPoints > 0 ? (captainPoints / totalPoints) * 100 : 0;

    // Calculate bench performance
    const benchPoints = scores.reduce((sum, score) => sum + (score.bench_points || 0), 0);
    const benchContribution = totalPoints > 0 ? (benchPoints / totalPoints) * 100 : 0;

    return {
      totalPoints,
      averageScore: parseFloat(averageScore.toFixed(1)),
      bestScore,
      worstScore,
      averageChange: parseFloat(averageChange.toFixed(1)),
      positiveWeeks,
      negativeWeeks,
      neutralWeeks,
      consistency: parseFloat(consistency.toFixed(1)),
      form: parseFloat(form.toFixed(1)),
      captainContribution: parseFloat(captainContribution.toFixed(1)),
      benchContribution: parseFloat(benchContribution.toFixed(1)),
      scores,
      scoreChanges
    };
  };

  const getPerformanceGrade = (consistency) => {
    if (consistency >= 80) return { grade: 'A+', color: 'text-green-600', bg: 'bg-green-100' };
    if (consistency >= 70) return { grade: 'A', color: 'text-green-600', bg: 'bg-green-100' };
    if (consistency >= 60) return { grade: 'B', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (consistency >= 50) return { grade: 'C', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    if (consistency >= 40) return { grade: 'D', color: 'text-orange-600', bg: 'bg-orange-100' };
    return { grade: 'F', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const getTrendIcon = (change) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Activity className="w-4 h-4 text-gray-400" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-600 mr-2">⚠️</div>
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
        <p className="text-gray-500">Analytics will be available once you have gameweek scores.</p>
      </div>
    );
  }

  const performanceGrade = getPerformanceGrade(analytics.consistency);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Performance Analytics</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setTimeRange('last5')}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                timeRange === 'last5' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Last 5
            </button>
            <button
              onClick={() => setTimeRange('last10')}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                timeRange === 'last10' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Last 10
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                timeRange === 'all' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Time
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {analytics.averageScore}
            </div>
            <div className="text-sm text-gray-600">Average Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {analytics.bestScore}
            </div>
            <div className="text-sm text-gray-600">Best Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {analytics.form}
            </div>
            <div className="text-sm text-gray-600">Current Form</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${performanceGrade.color}`}>
              {performanceGrade.grade}
            </div>
            <div className="text-sm text-gray-600">Consistency</div>
          </div>
        </div>
      </div>

      {/* Performance Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Consistency Score */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Target className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Consistency Score</h3>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Performance Stability</span>
            <span className={`px-2 py-1 rounded-full text-sm font-medium ${performanceGrade.bg} ${performanceGrade.color}`}>
              {analytics.consistency}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${analytics.consistency}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Higher scores indicate more consistent performance
          </p>
        </div>

        {/* Trend Analysis */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <LineChart className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Trend Analysis</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Average Change</span>
              <div className="flex items-center">
                {getTrendIcon(analytics.averageChange)}
                <span className={`ml-1 text-sm font-medium ${
                  analytics.averageChange > 0 ? 'text-green-600' : 
                  analytics.averageChange < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {analytics.averageChange > 0 ? '+' : ''}{analytics.averageChange}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Positive Weeks</span>
              <span className="text-sm font-medium text-green-600">
                {analytics.positiveWeeks}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Negative Weeks</span>
              <span className="text-sm font-medium text-red-600">
                {analytics.negativeWeeks}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Captain & Bench Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Award className="w-5 h-5 text-yellow-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Captain Performance</h3>
          </div>
          <div className="text-3xl font-bold text-yellow-600 mb-2">
            {analytics.captainContribution}%
          </div>
          <p className="text-sm text-gray-600">
            Percentage of total points from captain
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Users className="w-5 h-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Bench Performance</h3>
          </div>
          <div className="text-3xl font-bold text-purple-600 mb-2">
            {analytics.benchContribution}%
          </div>
          <p className="text-sm text-gray-600">
            Percentage of total points from bench
          </p>
        </div>
      </div>

      {/* Score History Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <BarChart3 className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Score History</h3>
        </div>
        <div className="space-y-2">
          {analytics.scores.map((score, index) => {
            const change = analytics.scoreChanges[index - 1];
            const maxScore = Math.max(...analytics.scores.map(s => s.total_points));
            const percentage = (score.total_points / maxScore) * 100;
            
            return (
              <div key={score.gameweek} className="flex items-center space-x-4">
                <div className="w-12 text-sm font-medium text-gray-600">
                  GW{score.gameweek}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {score.total_points} points
                    </span>
                    {change !== undefined && (
                      <div className="flex items-center">
                        {getTrendIcon(change)}
                        <span className={`ml-1 text-xs ${
                          change > 0 ? 'text-green-600' : 
                          change < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {change > 0 ? '+' : ''}{change}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance Insights */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <Zap className="w-5 h-5 text-orange-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Performance Insights</h3>
        </div>
        <div className="space-y-3">
          {analytics.consistency >= 70 && (
            <div className="flex items-start">
              <div className="text-green-500 mr-2">✓</div>
              <p className="text-sm text-gray-700">
                <strong>Excellent consistency!</strong> Your performance is very stable, which is great for long-term success.
              </p>
            </div>
          )}
          
          {analytics.form > analytics.averageScore && (
            <div className="flex items-start">
              <div className="text-green-500 mr-2">✓</div>
              <p className="text-sm text-gray-700">
                <strong>Great form!</strong> You're currently performing above your average.
              </p>
            </div>
          )}
          
          {analytics.captainContribution < 20 && (
            <div className="flex items-start">
              <div className="text-yellow-500 mr-2">⚠</div>
              <p className="text-sm text-gray-700">
                <strong>Captain selection:</strong> Consider choosing higher-scoring players as captain to maximize points.
              </p>
            </div>
          )}
          
          {analytics.averageChange < -2 && (
            <div className="flex items-start">
              <div className="text-red-500 mr-2">⚠</div>
              <p className="text-sm text-gray-700">
                <strong>Declining performance:</strong> Your scores have been decreasing recently. Consider reviewing your team selection.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GameweekAnalytics;
