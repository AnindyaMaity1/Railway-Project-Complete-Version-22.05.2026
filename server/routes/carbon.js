const express = require('express');
const { TrackFitting, Vendor, Inspection } = require('../models_mongo');
const { auth } = require('../middleware/auth');
const { runEcoRouteOptimization } = require('../utils/ecoRouteEngine');
const { runPredictiveSustainabilityAnalytics } = require('../utils/predictiveSustainabilityEngine');
const { runSustainabilityRiskHeatmap } = require('../utils/sustainabilityHeatmapEngine');
const { runGreenMaterialRecommendations } = require('../utils/greenMaterialEngine');
const { runVendorSustainabilityIntelligence } = require('../utils/vendorSustainabilityEngine');
const { runClimateResilienceIntelligence } = require('../utils/climateResilienceEngine');
const { runNetZeroMissionDashboard } = require('../utils/netZeroMissionEngine');
const { runAutonomousSustainabilityRecommendations } = require('../utils/autonomousSustainabilityEngine');
const { runRailwayGreenScore } = require('../utils/railwayGreenScoreEngine');
const { runScenarioSimulator, runScenarioById } = require('../utils/scenarioSimulatorEngine');
const { runSdgAlignmentEngine } = require('../utils/sdgAlignmentEngine');
const {
  SIMULATION_PRESETS,
  buildFleetContext,
  buildInsights,
  buildPathways,
  buildLeaderboard,
  buildProcurement,
  runSimulation,
  buildAssetTwin,
  buildCertificate,
  runCopilot
} = require('../utils/greenGuardEngine');

const router = express.Router();

const loadFleet = async () => {
  const trackFittings = await TrackFitting.find().lean();
  const vendors = await Vendor.find().lean();
  const ctx = buildFleetContext(trackFittings, vendors);
  return { trackFittings, vendors, ctx };
};

router.get('/insights', auth, async (req, res) => {
  try {
    const { ctx } = await loadFleet();
    res.json({ success: true, data: buildInsights(ctx) });
  } catch (error) {
    console.error('GreenGuard insights error:', error);
    res.status(500).json({ success: false, message: 'Failed to load insights' });
  }
});

router.get('/pathways', auth, async (req, res) => {
  try {
    const { ctx } = await loadFleet();
    res.json({ success: true, data: buildPathways(ctx) });
  } catch (error) {
    console.error('GreenGuard pathways error:', error);
    res.status(500).json({ success: false, message: 'Failed to load pathways' });
  }
});

router.get('/leaderboard', auth, async (req, res) => {
  try {
    const { ctx } = await loadFleet();
    res.json({ success: true, data: buildLeaderboard(ctx) });
  } catch (error) {
    console.error('GreenGuard leaderboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to load leaderboard' });
  }
});

router.get('/procurement', auth, async (req, res) => {
  try {
    const { ctx } = await loadFleet();
    res.json({ success: true, data: buildProcurement(ctx) });
  } catch (error) {
    console.error('GreenGuard procurement error:', error);
    res.status(500).json({ success: false, message: 'Failed to load procurement' });
  }
});

router.get('/simulate/presets', auth, async (req, res) => {
  res.json({ success: true, data: SIMULATION_PRESETS });
});

router.post('/copilot', auth, async (req, res) => {
  try {
    const { trackFittings, vendors } = await loadFleet();
    const { message, history } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }
    const data = await runCopilot(String(message).trim(), history || [], trackFittings, vendors);
    res.json({ success: true, data });
  } catch (error) {
    console.error('GreenGuard copilot error:', error);
    res.status(500).json({ success: false, message: 'Copilot request failed' });
  }
});

router.post('/simulate', auth, async (req, res) => {
  try {
    const { trackFittingId, scenarios } = req.body;
    if (!trackFittingId) {
      return res.status(400).json({ success: false, message: 'trackFittingId is required' });
    }
    const item = await TrackFitting.findById(trackFittingId).lean();
    if (!item) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }
    const data = runSimulation(item, scenarios || {});
    res.json({ success: true, data });
  } catch (error) {
    console.error('GreenGuard simulate error:', error);
    res.status(500).json({ success: false, message: 'Simulation failed' });
  }
});

router.get('/digital-twin/:id', auth, async (req, res) => {
  try {
    const item = await TrackFitting.findById(req.params.id).lean();
    if (!item) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }
    res.json({ success: true, data: buildAssetTwin(item) });
  } catch (error) {
    console.error('GreenGuard twin error:', error);
    res.status(500).json({ success: false, message: 'Digital twin load failed' });
  }
});

router.get('/certificate/:id', auth, async (req, res) => {
  try {
    const item = await TrackFitting.findById(req.params.id).lean();
    if (!item) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }
    res.json({ success: true, data: buildCertificate(item) });
  } catch (error) {
    console.error('GreenGuard certificate error:', error);
    res.status(500).json({ success: false, message: 'Certificate generation failed' });
  }
});

// Sustainability Risk Heatmap — corridor risk cells and category sectors
router.get('/risk-heatmap', auth, async (req, res) => {
  try {
    const trackFittings = await TrackFitting.find().lean();
    const heatmap = runSustainabilityRiskHeatmap(trackFittings);
    res.json({ success: true, data: heatmap });
  } catch (error) {
    console.error('Risk heatmap error:', error);
    res.status(500).json({ success: false, message: 'Failed to build sustainability risk heatmap' });
  }
});

// Predictive Sustainability Analytics — future cost, components, carbon-heavy zones
router.get('/predictive-analytics', auth, async (req, res) => {
  try {
    const trackFittings = await TrackFitting.find().lean();
    const analytics = runPredictiveSustainabilityAnalytics(trackFittings);
    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Predictive analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to run predictive sustainability analytics' });
  }
});

// Global SDG Alignment Engine
router.get('/sdg-alignment', auth, async (req, res) => {
  try {
    const trackFittings = await TrackFitting.find().lean();
    const vendors = await Vendor.find().lean();
    const alignment = runSdgAlignmentEngine(trackFittings, vendors);
    res.json({ success: true, data: alignment });
  } catch (error) {
    console.error('SDG alignment error:', error);
    res.status(500).json({ success: false, message: 'Failed to build SDG alignment report' });
  }
});

// Sustainability Scenario Simulator
router.get('/scenario-simulator', auth, async (req, res) => {
  try {
    const trackFittings = await TrackFitting.find().lean();
    const simulator = runScenarioSimulator(trackFittings, {
      scenarioId: req.query.scenario
    });
    res.json({ success: true, data: simulator });
  } catch (error) {
    console.error('Scenario simulator error:', error);
    res.status(500).json({ success: false, message: 'Failed to run scenario simulator' });
  }
});

router.post('/scenario-simulator', auth, async (req, res) => {
  try {
    const trackFittings = await TrackFitting.find().lean();
    const { scenarioId } = req.body || {};
    if (scenarioId) {
      const result = runScenarioById(trackFittings, scenarioId);
      if (!result) {
        return res.status(400).json({ success: false, message: 'Unknown scenario id' });
      }
      const full = runScenarioSimulator(trackFittings, { scenarioId });
      return res.json({ success: true, data: { ...full, selectedScenario: result } });
    }
    const simulator = runScenarioSimulator(trackFittings);
    res.json({ success: true, data: simulator });
  } catch (error) {
    console.error('Scenario simulator POST error:', error);
    res.status(500).json({ success: false, message: 'Scenario simulation failed' });
  }
});

// Railway Green Score — universal zone sustainability scoring
router.get('/railway-green-score', auth, async (req, res) => {
  try {
    const trackFittings = await TrackFitting.find().lean();
    const vendors = await Vendor.find().lean();
    const scorecard = runRailwayGreenScore(trackFittings, vendors);
    res.json({ success: true, data: scorecard });
  } catch (error) {
    console.error('Railway green score error:', error);
    res.status(500).json({ success: false, message: 'Failed to compute railway green score' });
  }
});

// Autonomous Sustainability Recommendations (Agentic Intelligence)
router.get('/autonomous-recommendations', auth, async (req, res) => {
  try {
    const trackFittings = await TrackFitting.find().lean();
    const vendors = await Vendor.find().lean();
    const recommendations = runAutonomousSustainabilityRecommendations(trackFittings, vendors);
    res.json({ success: true, data: recommendations });
  } catch (error) {
    console.error('Autonomous recommendations error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate autonomous sustainability recommendations' });
  }
});

// AI Net-Zero Mission Dashboard
router.get('/net-zero-mission', auth, async (req, res) => {
  try {
    const trackFittings = await TrackFitting.find().lean();
    const vendors = await Vendor.find().lean();
    const dashboard = runNetZeroMissionDashboard(trackFittings, vendors);
    res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error('Net-zero mission error:', error);
    res.status(500).json({ success: false, message: 'Failed to build net-zero mission dashboard' });
  }
});

// Climate Resilience Intelligence
router.get('/climate-resilience', auth, async (req, res) => {
  try {
    const trackFittings = await TrackFitting.find().lean();
    const intelligence = runClimateResilienceIntelligence(trackFittings);
    res.json({ success: true, data: intelligence });
  } catch (error) {
    console.error('Climate resilience error:', error);
    res.status(500).json({ success: false, message: 'Failed to build climate resilience intelligence' });
  }
});

// Vendor Sustainability Intelligence
router.get('/vendor-intelligence', auth, async (req, res) => {
  try {
    const trackFittings = await TrackFitting.find().lean();
    const vendors = await Vendor.find().lean();
    const intelligence = runVendorSustainabilityIntelligence(vendors, trackFittings);
    res.json({ success: true, data: intelligence });
  } catch (error) {
    console.error('Vendor intelligence error:', error);
    res.status(500).json({ success: false, message: 'Failed to build vendor sustainability intelligence' });
  }
});

// Smart Green Material Recommendation AI
router.get('/material-recommendations', auth, async (req, res) => {
  try {
    const trackFittings = await TrackFitting.find().lean();
    const recommendations = runGreenMaterialRecommendations(trackFittings);
    res.json({ success: true, data: recommendations });
  } catch (error) {
    console.error('Material recommendations error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate material recommendations' });
  }
});

// Eco-Route Optimization Engine — maintenance routes, inspection plans, technician deployment
router.get('/eco-route', auth, async (req, res) => {
  try {
    const trackFittings = await TrackFitting.find().lean();
    const inspections = await Inspection.find().lean();
    const optimization = runEcoRouteOptimization(trackFittings, inspections, {
      depotLat: req.query.depotLat,
      depotLon: req.query.depotLon,
      depotLabel: req.query.depotLabel
    });

    res.json({ success: true, data: optimization });
  } catch (error) {
    console.error('Eco-route optimization error:', error);
    res.status(500).json({ success: false, message: 'Failed to compute eco-route optimization' });
  }
});

module.exports = router;
