import React, { useState, useEffect, useRef } from 'react';
import {
  Row, Col, Card, Button, Badge, Form, Spinner, Alert, ListGroup, Tab, Tabs, ProgressBar
} from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from 'chart.js';
import {
  FaLeaf, FaRobot, FaFlask, FaRoute, FaCube, FaTrophy, FaPaperPlane,
  FaCertificate, FaShoppingCart, FaBell, FaTrain, FaSync
} from 'react-icons/fa';
import LoadingSpinner from './LoadingSpinner';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const QUICK_PROMPTS = [
  'What is our total carbon footprint?',
  'Which asset is our worst emitter?',
  'How do we reach net-zero by 2050?',
  'Which vendors are the greenest?',
  'Why is our sustainability score low?',
  'How can we reduce emissions this quarter?'
];

const chartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: true, labels: { boxWidth: 12 } } },
  scales: {
    x: { grid: { color: 'rgba(148,163,184,0.12)' }, ticks: { maxTicksLimit: 8 } },
    y: { grid: { color: 'rgba(148,163,184,0.12)' } }
  }
};

const GreenGuardCopilot = () => {
  const [activeTab, setActiveTab] = useState('copilot');
  const [initialLoading, setInitialLoading] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([
    {
      role: 'assistant',
      text: 'Namaste! I am **GreenGuard** — your railway sustainability copilot. I answer using **live fleet data**. Try: "What is our total carbon footprint?", "Which asset emits the most?", or "How do we improve our sustainability score?"'
    }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [pathways, setPathways] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [procurement, setProcurement] = useState([]);
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState('');
  const [presets, setPresets] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const [twin, setTwin] = useState(null);
  const [certificate, setCertificate] = useState(null);
  const chatEndRef = useRef(null);

  const loadData = async () => {
    try {
      const [ins, path, lb, proc, inv, pre] = await Promise.all([
        axios.get('/api/carbon/insights'),
        axios.get('/api/carbon/pathways'),
        axios.get('/api/carbon/leaderboard'),
        axios.get('/api/carbon/procurement'),
        axios.get('/api/inventory', { params: { limit: 100 } }),
        axios.get('/api/carbon/simulate/presets')
      ]);
      if (ins.data.success) setInsights(ins.data.data);
      if (path.data.success) setPathways(path.data.data);
      if (lb.data.success) setLeaderboard(lb.data.data);
      if (proc.data.success) setProcurement(proc.data.data);
      if (inv.data.success) setAssets(inv.data.data.trackFittings || []);
      if (pre.data.success) setPresets(pre.data.data);
    } catch (e) {
      console.error(e);
      toast.error('GreenGuard could not load fleet data.');
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const formatReply = (text) => {
    if (!text) return null;
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const sendMessage = async (text) => {
    const msg = text || chatInput;
    if (!msg.trim()) return;
    setChatInput('');
    const historyBefore = chatHistory.filter((m) => m.role === 'user' || m.role === 'assistant');
    setChatHistory((h) => [...h, { role: 'user', text: msg }]);
    setChatLoading(true);
    try {
      const res = await axios.post(
        '/api/carbon/copilot',
        {
          message: msg,
          history: historyBefore.slice(-8).map((m) => ({ role: m.role, text: m.text }))
        },
        { timeout: 90000 }
      );
      if (res.data.success) {
        const data = res.data.data;
        setChatHistory((h) => [
          ...h,
          {
            role: 'assistant',
            text: data.reply,
            segments: data.segments,
            intents: data.intents,
            dataUsed: data.dataUsed
          }
        ]);
      } else {
        setChatHistory((h) => [
          ...h,
          { role: 'assistant', text: res.data.message || 'No response from GreenGuard.' }
        ]);
      }
    } catch {
      setChatHistory((h) => [
        ...h,
        {
          role: 'assistant',
          text: 'I could not reach the sustainability engine. Ensure the server is running and you are logged in.'
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const runSimulation = async () => {
    if (!selectedAsset) {
      toast.warn('Select an asset first');
      return;
    }
    const preset = presets.find((p) => p.id === selectedPreset);
    const scenarios = preset?.scenarios || { transportMode: 'rail', recyclability: 0.85 };
    setSimLoading(true);
    try {
      const res = await axios.post('/api/carbon/simulate', { trackFittingId: selectedAsset, scenarios });
      if (res.data.success) {
        setSimResult(res.data.data);
        toast.success(`Scenario: ${res.data.data.impact.percentReduction}% reduction`);
      }
    } catch {
      toast.error('Simulation failed');
    } finally {
      setSimLoading(false);
    }
  };

  const loadTwin = async (id) => {
    if (!id) return;
    try {
      const res = await axios.get(`/api/carbon/digital-twin/${id}`);
      if (res.data.success) setTwin(res.data.data);
    } catch {
      toast.error('Could not load digital twin');
    }
  };

  const loadCertificate = async (id) => {
    if (!id) return;
    try {
      const res = await axios.get(`/api/carbon/certificate/${id}`);
      if (res.data.success) {
        setCertificate(res.data.data);
        toast.success('Green certificate generated');
      }
    } catch {
      toast.error('Certificate generation failed');
    }
  };

  const pathwayChart = pathways?.pathways?.[1];
  const chartData = pathwayChart
    ? {
        labels: pathwayChart.milestones.map((m) => m.year),
        datasets: [
          {
            label: pathwayChart.name,
            data: pathwayChart.milestones.map((m) => m.emissionsKg),
            borderColor: pathwayChart.color,
            backgroundColor: `${pathwayChart.color}33`,
            fill: true,
            tension: 0.35
          }
        ]
      }
    : null;

  if (initialLoading) {
    return <LoadingSpinner message="GreenGuard Bot is connecting to live fleet data..." size="lg" />;
  }

  return (
    <div className="greenguard-copilot">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h5 className="fw-bold mb-1 d-flex align-items-center gap-2">
            <FaRobot className="text-success" />
            GreenGuard Bot
          </h5>
          <p className="text-muted mb-0 small">
            AI sustainability copilot — What-If Lab, Net-Zero pathways, eco twins, green procurement, and live fleet Q&A.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Badge bg="success" pill className="d-flex align-items-center gap-1 px-3 py-2">
            <FaTrain className="me-1" />
            RailGreen AI
          </Badge>
          <Button
            variant="outline-secondary"
            size="sm"
            className="d-flex align-items-center gap-1"
            onClick={loadData}
          >
            <FaSync />
            Refresh
          </Button>
        </div>
      </div>

      <Card
        className="border-0 shadow-sm mb-4"
        style={{
          borderRadius: 20,
          background: 'linear-gradient(135deg, #14532d 0%, #166534 40%, #0d9488 100%)'
        }}
      >
        <Card.Body className="py-3 px-4">
          <Row className="align-items-center">
            <Col md={8}>
              <h6 className="text-white fw-bold mb-1">GreenGuard AI Copilot</h6>
              <p className="text-white opacity-90 mb-0 small">
                Unique sustainability intelligence powered by your inventory, carbon engine, and AI brain.
              </p>
            </Col>
            <Col md={4} className="text-md-end mt-2 mt-md-0">
              <Badge bg="light" text="dark" className="me-2">
                <FaLeaf className="me-1" />
                Live fleet
              </Badge>
              <Badge bg="light" text="dark">
                {assets.length} assets
              </Badge>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {insights?.alerts?.length > 0 && (
        <Alert variant="warning" className="d-flex align-items-start gap-2 border-0 shadow-sm mb-4">
          <FaBell className="mt-1 flex-shrink-0" />
          <div>
            <strong>{insights.alerts.length} live sustainability alert(s)</strong>
            <div className="small mt-1">
              {insights.alerts[0]?.title}: {insights.alerts[0]?.message}
            </div>
          </div>
        </Alert>
      )}

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4 greenguard-tabs">
        <Tab eventKey="copilot" title={<><FaRobot className="me-1" />AI Advisor</>}>
          <Row className="g-3">
            <Col lg={8}>
              <Card className="border-0 shadow-sm h-100" style={{ borderRadius: 18 }}>
                <Card.Body className="d-flex flex-column" style={{ minHeight: 420 }}>
                  <div className="flex-grow-1 overflow-auto mb-3" style={{ maxHeight: 360 }}>
                    {chatHistory.map((m, i) => (
                      <div key={i} className={`mb-3 ${m.role === 'user' ? 'text-end' : ''}`}>
                        <div
                          className={`d-inline-block p-3 rounded-3 ${
                            m.role === 'user' ? 'bg-primary text-white' : 'bg-light'
                          }`}
                          style={{ maxWidth: '85%', textAlign: 'left', whiteSpace: 'pre-wrap' }}
                        >
                          {m.role === 'assistant' ? formatReply(m.text) : m.text}
                        </div>
                        {m.role === 'assistant' && m.dataUsed && (
                          <div className="small text-muted mt-1">
                            Live data: {m.dataUsed.assetCount} assets ·{' '}
                            {m.dataUsed.fleetCo2eKg?.toLocaleString()} kg CO₂e
                          </div>
                        )}
                      </div>
                    ))}
                    {chatLoading && <Spinner size="sm" variant="success" />}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="d-flex gap-2">
                    <Form.Control
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask GreenGuard anything about sustainability..."
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      style={{ borderRadius: 12 }}
                    />
                    <Button variant="success" onClick={() => sendMessage()} disabled={chatLoading}>
                      <FaPaperPlane />
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4}>
              <Card className="border-0 shadow-sm mb-3" style={{ borderRadius: 18 }}>
                <Card.Header className="bg-white fw-bold border-0 pt-3">Quick prompts</Card.Header>
                <ListGroup variant="flush">
                  {QUICK_PROMPTS.map((p, i) => (
                    <ListGroup.Item
                      key={i}
                      action
                      onClick={() => sendMessage(p)}
                      className="small border-0"
                    >
                      {p}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Card>
              {insights?.narrative && (
                <Card className="border-0 shadow-sm bg-success-subtle" style={{ borderRadius: 18 }}>
                  <Card.Body className="small">
                    <strong>AI Executive Brief</strong>
                    <p className="mb-2 mt-2">{formatReply(insights.narrative.executiveSummary)}</p>
                    <ul className="mb-0 ps-3">
                      {insights.narrative.insights?.slice(0, 2).map((x, i) => (
                        <li key={i}>{formatReply(x)}</li>
                      ))}
                    </ul>
                  </Card.Body>
                </Card>
              )}
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="whatif" title={<><FaFlask className="me-1" />What-If Lab</>}>
          <Card className="border-0 shadow-sm" style={{ borderRadius: 18 }}>
            <Card.Body>
              <p className="text-muted">
                Simulate material swaps, transport modes, and maintenance strategies before committing.
              </p>
              <Row className="g-3 mb-3">
                <Col md={4}>
                  <Form.Label>Asset</Form.Label>
                  <Form.Select value={selectedAsset} onChange={(e) => setSelectedAsset(e.target.value)}>
                    <option value="">Select asset</option>
                    {assets.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.serialNumber} — {a.itemType?.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={4}>
                  <Form.Label>Preset scenario</Form.Label>
                  <Form.Select value={selectedPreset} onChange={(e) => setSelectedPreset(e.target.value)}>
                    <option value="">Custom / pick preset</option>
                    {presets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={4} className="d-flex align-items-end">
                  <Button variant="success" onClick={runSimulation} disabled={simLoading}>
                    {simLoading ? <Spinner size="sm" /> : 'Run simulation'}
                  </Button>
                </Col>
              </Row>
              {simResult && (
                <Row className="g-3">
                  <Col md={4}>
                    <Card className="bg-light border-0">
                      <Card.Body>
                        <small className="text-muted">Baseline</small>
                        <h4>{simResult.baseline.totalCo2eKg} kg</h4>
                        <Badge bg="secondary">{simResult.baseline.grade}</Badge>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={4}>
                    <Card className="bg-success-subtle border-0">
                      <Card.Body>
                        <small className="text-muted">Projected</small>
                        <h4>{simResult.projected.totalCo2eKg} kg</h4>
                        <Badge bg="success">{simResult.projected.grade}</Badge>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={4}>
                    <Card className="border-success border-2">
                      <Card.Body>
                        <small className="text-muted">Savings</small>
                        <h4 className="text-success">-{simResult.impact.co2eSavedKg} kg</h4>
                        <Badge bg="success">{simResult.impact.percentReduction}%</Badge>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={12}>
                    <Alert variant="info" className="mb-0">
                      {simResult.aiInsight}
                    </Alert>
                  </Col>
                </Row>
              )}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="pathways" title={<><FaRoute className="me-1" />Net-Zero</>}>
          <Row className="g-3">
            <Col lg={8}>
              {chartData && (
                <Card className="border-0 shadow-sm" style={{ borderRadius: 18 }}>
                  <Card.Header className="bg-white fw-bold border-0">
                    Balanced pathway to {pathways?.targetYear}
                  </Card.Header>
                  <Card.Body style={{ height: 260 }}>
                    <Line data={chartData} options={chartOpts} />
                  </Card.Body>
                </Card>
              )}
            </Col>
            <Col lg={4}>
              {(pathways?.pathways || []).map((p) => (
                <Card key={p.id} className="border-0 shadow-sm mb-2" style={{ borderRadius: 14 }}>
                  <Card.Body className="py-2">
                    <div className="d-flex justify-content-between">
                      <strong className="small">{p.name}</strong>
                      <Badge bg={p.onTrack ? 'success' : 'warning'}>{p.reductionPercent}%↓</Badge>
                    </div>
                    <small className="text-muted">{p.description}</small>
                  </Card.Body>
                </Card>
              ))}
              {pathways?.aiRecommendation && (
                <Alert variant="success" className="small">
                  {pathways.aiRecommendation}
                </Alert>
              )}
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="twin" title={<><FaCube className="me-1" />Eco Twin</>}>
          <Row className="g-3">
            <Col md={4}>
              <Form.Select
                value={selectedAsset}
                onChange={(e) => {
                  setSelectedAsset(e.target.value);
                  loadTwin(e.target.value);
                }}
              >
                <option value="">Select asset for digital twin</option>
                {assets.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.serialNumber}
                  </option>
                ))}
              </Form.Select>
              <Button
                className="mt-2"
                variant="outline-success"
                size="sm"
                onClick={() => loadCertificate(selectedAsset)}
              >
                <FaCertificate className="me-1" />
                Green Certificate
              </Button>
            </Col>
            {twin && (
              <Col md={8}>
                <Card className="border-0 shadow-sm" style={{ borderRadius: 18 }}>
                  <Card.Body>
                    <div className="d-flex justify-content-between mb-3">
                      <div>
                        <h5>{twin.twin.twinId}</h5>
                        <Badge
                          bg={
                            twin.twin.sustainabilityPulse === 'healthy'
                              ? 'success'
                              : twin.twin.sustainabilityPulse === 'watch'
                                ? 'warning'
                                : 'danger'
                          }
                        >
                          {twin.twin.sustainabilityPulse}
                        </Badge>
                      </div>
                      <div className="text-end">
                        <h3 className="mb-0">{twin.twin.twinHealthScore}</h3>
                        <small className="text-muted">Twin Health</small>
                      </div>
                    </div>
                    <p className="small">{twin.twin.aiTwinSummary}</p>
                    <ProgressBar
                      now={twin.twin.lifeProgressPercent}
                      label={`Lifecycle ${twin.twin.lifeProgressPercent}%`}
                      className="mb-3"
                    />
                    <Row>
                      <Col xs={6}>
                        <small>Phase</small>
                        <div className="fw-bold">{twin.twin.lifecyclePhase}</div>
                      </Col>
                      <Col xs={6}>
                        <small>Velocity</small>
                        <div className="fw-bold">{twin.twin.emissionVelocityKgPerMonth} kg/mo</div>
                      </Col>
                    </Row>
                    {twin.twin.riskZones?.map((z, i) => (
                      <Badge key={i} bg="warning" text="dark" className="me-1 mt-2">
                        {z.label}
                      </Badge>
                    ))}
                    {twin.benchmark && (
                      <Alert variant="light" className="mt-3 small mb-0">
                        {twin.benchmark.aiBenchmarkNote}
                      </Alert>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            )}
            {certificate && (
              <Col xs={12}>
                <Card className="border-success border-2 bg-success-subtle" style={{ borderRadius: 18 }}>
                  <Card.Body>
                    <h5>
                      <FaCertificate className="text-success me-2" />
                      {certificate.issuer}
                    </h5>
                    <p className="mb-1">
                      <strong>ID:</strong> {certificate.certificateId}
                    </p>
                    <p className="mb-1">
                      Grade: <Badge bg="success">{certificate.metrics.grade}</Badge> —{' '}
                      {certificate.metrics.totalCo2eKg} kg CO₂e
                    </p>
                    <small className="text-muted">
                      Valid until {new Date(certificate.validUntil).toLocaleDateString()}
                    </small>
                  </Card.Body>
                </Card>
              </Col>
            )}
          </Row>
        </Tab>

        <Tab eventKey="leaderboard" title={<><FaTrophy className="me-1" />Leaderboard</>}>
          <Row className="g-3">
            <Col md={6}>
              <Card className="border-0 shadow-sm" style={{ borderRadius: 18 }}>
                <Card.Header className="bg-white fw-bold border-0">Top green assets</Card.Header>
                <ListGroup variant="flush">
                  {(leaderboard?.topGreenAssets || []).map((a) => (
                    <ListGroup.Item key={a.rank} className="d-flex justify-content-between border-0">
                      <span>
                        #{a.rank} {a.serialNumber} {a.badge === 'eco_champion' && '🏆'}
                      </span>
                      <Badge bg="success">{a.score}</Badge>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="border-0 shadow-sm" style={{ borderRadius: 18 }}>
                <Card.Header className="bg-white fw-bold border-0">
                  <FaShoppingCart className="me-1" />
                  Green procurement AI
                </Card.Header>
                <ListGroup variant="flush">
                  {procurement.slice(0, 6).map((v, i) => (
                    <ListGroup.Item
                      key={i}
                      className="d-flex justify-content-between align-items-center border-0"
                    >
                      <span>{v.companyName}</span>
                      <div>
                        <Badge
                          bg={v.recommendation === 'preferred' ? 'success' : 'secondary'}
                          className="me-1"
                        >
                          {v.recommendation}
                        </Badge>
                        <Badge bg="info">{v.currentRating}</Badge>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Card>
            </Col>
          </Row>
        </Tab>
      </Tabs>
    </div>
  );
};

export default GreenGuardCopilot;
