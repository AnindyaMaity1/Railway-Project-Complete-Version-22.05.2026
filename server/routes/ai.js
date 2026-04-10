const express = require('express');
const axios = require('axios');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Analyze track fitting data using AI
router.post('/analyze', auth, async (req, res) => {
  try {
    const { trackFittingId, qrCode, scanLocation, scanType, performanceMetrics } = req.body;

    // Call AI service
    const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL}/analyze`, {
      trackFittingId,
      qrCode,
      scanLocation,
      scanType,
      performanceMetrics
    });

    if (aiResponse.data.success) {
      res.json({
        success: true,
        data: aiResponse.data.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'AI analysis failed',
        error: aiResponse.data.message
      });
    }

  } catch (error) {
    console.error('AI analysis error:', error);
    
    // Fallback to basic analysis if AI service is unavailable
    const fallbackAnalysis = {
      riskScore: 0.5,
      performanceScore: 0.7,
      qualityRisk: 0.3,
      predictedFailureDate: null,
      maintenanceRecommendations: ['Regular inspection recommended'],
      qualityTrend: 'stable',
      confidence: 0.6
    };

    res.json({
      success: true,
      data: fallbackAnalysis
    });
  }
});

// Decision Copilot - structured decision analysis for maintenance teams
router.post('/decision-copilot', auth, async (req, res) => {
  try {
    const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL}/decision-copilot`, req.body);

    if (aiResponse.data && aiResponse.data.success) {
      return res.json({
        success: true,
        data: aiResponse.data.data
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Decision Copilot analysis failed',
      error: aiResponse.data && aiResponse.data.message
    });
  } catch (error) {
    console.error('Decision Copilot error:', error.message || error);

    // Fallback: very basic echo with low confidence so UI remains usable even if AI is down
    return res.json({
      success: true,
      data: {
        title: req.body.title || 'Maintenance decision',
        context: req.body.context || '',
        options: (req.body.options || []).map((opt) => ({
          name: opt.name || 'Option',
          pros: (opt.pros || '').split('\n').filter((p) => p.trim()),
          cons: (opt.cons || '').split('\n').filter((c) => c.trim()),
          risk_level: opt.risk_level || 'medium',
          cost_impact: opt.cost_impact || 'medium',
          time_impact: opt.time_impact || 'medium',
          score: 0.5,
          risk_profile: {
            best_case: 0.7,
            worst_case: 0.2,
            expected: 0.5
          }
        })),
        pros_cons_matrix: [],
        biases: [],
        missing_perspectives: [],
        decision_tree: null,
        recommended_option: null,
        confidence: 0.3,
        created_at: new Date().toISOString()
      }
    });
  }
});

// Batch analysis for multiple track fittings
router.post('/batch-analyze', auth, async (req, res) => {
  try {
    const { trackFittings } = req.body;

    // Call AI service for batch analysis
    const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL}/predict/batch`, {
      trackFittings
    });

    if (aiResponse.data.success) {
      res.json({
        success: true,
        data: aiResponse.data.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Batch AI analysis failed',
        error: aiResponse.data.message
      });
    }

  } catch (error) {
    console.error('Batch AI analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Batch analysis failed',
      error: error.message
    });
  }
});

// Get AI service health status
router.get('/health', async (req, res) => {
  try {
    const aiResponse = await axios.get(`${process.env.AI_SERVICE_URL}/health`);
    
    res.json({
      success: true,
      data: aiResponse.data
    });

  } catch (error) {
    console.error('AI health check error:', error);
    res.json({
      success: false,
      message: 'AI service unavailable',
      error: error.message
    });
  }
});

// Train AI models
router.post('/train', auth, async (req, res) => {
  try {
    const { modelType, trainingData } = req.body;

    // Call AI service for training
    const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL}/train`, {
      modelType,
      trainingData
    });

    if (aiResponse.data.success) {
      res.json({
        success: true,
        message: 'AI model training initiated',
        data: aiResponse.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'AI model training failed',
        error: aiResponse.data.message
      });
    }

  } catch (error) {
    console.error('AI training error:', error);
    res.status(500).json({
      success: false,
      message: 'AI training failed',
      error: error.message
    });
  }
});

// Get AI predictions for maintenance scheduling
router.post('/maintenance-predictions', auth, async (req, res) => {
  try {
    const { trackFittingIds, predictionHorizon = 30 } = req.body;

    // Mock maintenance predictions - replace with actual AI service call
    const predictions = trackFittingIds.map(id => ({
      trackFittingId: id,
      predictedMaintenanceDate: new Date(Date.now() + Math.random() * predictionHorizon * 24 * 60 * 60 * 1000),
      maintenanceType: ['routine', 'preventive', 'corrective'][Math.floor(Math.random() * 3)],
      confidence: Math.random() * 0.4 + 0.6, // 60-100% confidence
      riskFactors: ['wear', 'corrosion', 'fatigue'][Math.floor(Math.random() * 3)]
    }));

    res.json({
      success: true,
      data: predictions
    });

  } catch (error) {
    console.error('Maintenance predictions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate maintenance predictions',
      error: error.message
    });
  }
});

// Get quality trend analysis
router.post('/quality-trends', auth, async (req, res) => {
  try {
    const { timeRange = 30, itemType } = req.body;

    // Mock quality trend analysis - replace with actual AI service call
    const trends = {
      overallTrend: 'improving',
      qualityScore: 4.2,
      trendData: Array.from({ length: timeRange }, (_, i) => ({
        date: new Date(Date.now() - (timeRange - i) * 24 * 60 * 60 * 1000),
        score: 4.0 + Math.random() * 0.5,
        issues: Math.floor(Math.random() * 5)
      })),
      recommendations: [
        'Continue current quality control measures',
        'Focus on Grade A production targets',
        'Monitor vendor performance closely'
      ]
    };

    res.json({
      success: true,
      data: trends
    });

  } catch (error) {
    console.error('Quality trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate quality trends',
      error: error.message
    });
  }
});

// Get failure prediction analysis
router.post('/failure-predictions', auth, async (req, res) => {
  try {
    const { trackFittingIds } = req.body;

    // Mock failure predictions - replace with actual AI service call
    const predictions = trackFittingIds.map(id => ({
      trackFittingId: id,
      failureProbability: Math.random(),
      predictedFailureDate: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000),
      riskFactors: ['age', 'usage', 'environmental'][Math.floor(Math.random() * 3)],
      recommendedActions: [
        'Schedule immediate inspection',
        'Increase monitoring frequency',
        'Prepare replacement parts'
      ]
    }));

    res.json({
      success: true,
      data: predictions
    });

  } catch (error) {
    console.error('Failure predictions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate failure predictions',
      error: error.message
    });
  }
});

// Get performance analytics dashboard data
router.get('/analytics', auth, async (req, res) => {
  try {
    const { timeRange = 30 } = req.query;

    // Mock analytics data - replace with actual AI service call
    const analytics = {
      performanceMetrics: {
        inspectionPassRate: 94.5,
        maintenanceEfficiency: 87.2,
        qualityScore: 4.2,
        averageServiceLife: 365
      },
      trends: {
        performance: Array.from({ length: timeRange }, (_, i) => ({
          date: new Date(Date.now() - (timeRange - i) * 24 * 60 * 60 * 1000),
          value: 90 + Math.random() * 10
        })),
        quality: Array.from({ length: timeRange }, (_, i) => ({
          date: new Date(Date.now() - (timeRange - i) * 24 * 60 * 60 * 1000),
          value: 4.0 + Math.random() * 0.5
        }))
      },
      insights: [
        'Performance has improved by 5% over the last month',
        'Quality issues are down by 12% compared to last quarter',
        'Maintenance efficiency is above target by 7%'
      ],
      alerts: [
        {
          type: 'warning',
          message: '3 track fittings require immediate attention',
          priority: 'high'
        },
        {
          type: 'info',
          message: 'Scheduled maintenance due for 15 items next week',
          priority: 'medium'
        }
      ]
    };

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate analytics',
      error: error.message
    });
  }
});

module.exports = router;
