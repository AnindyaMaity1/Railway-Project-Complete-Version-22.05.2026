import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Badge, ProgressBar, Table, Alert } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { Bar, Doughnut, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement
} from 'chart.js';
import {
  FaBalanceScale, FaExclamationTriangle, FaChartLine,
  FaLightbulb, FaPlus, FaTrash, FaPlay,
  FaCheck, FaTimes, FaArrowRight, FaDownload, FaChartBar,
  FaMoneyBillWave, FaBullseye, FaSync
} from 'react-icons/fa';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement
);

const DecisionCopilot = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [options, setOptions] = useState([
    { id: 1, label: 'Option A' },
    { id: 2, label: 'Option B' }
  ]);
  const [formData, setFormData] = useState({
    title: '',
    context: '',
    notes: '',
    preferredOptionId: null
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOptionChange = (id, value) => {
    setOptions(prev => prev.map(opt => 
      opt.id === id ? { ...opt, label: value } : opt
    ));
  };

  const addOption = () => {
    const newId = options.length + 1;
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const letterIndex = options.length < letters.length ? options.length : options.length % letters.length;
    setOptions(prev => [...prev, { id: newId, label: `Option ${letters[letterIndex]}` }]);
  };

  const removeOption = (id) => {
    if (options.length > 2) {
      setOptions(prev => prev.filter(opt => opt.id !== id));
    }
  };

  const handleAnalyze = async () => {
    if (!formData.title) {
      toast.error('Please enter a decision title');
      return;
    }
    if (options.some(o => !o.label.trim())) {
      toast.error('Please fill in all options');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        options: options.map((o, idx) => ({ id: `opt-${o.id}`, label: o.label }))
      };
      // use backend proxy path rather than direct microservice address
      const response = await axios.post('/api/decision-copilot/analyze', payload);
      setAnalysis(response.data);
      toast.success('Analysis complete!');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!analysis) return;
    try {
      const response = await axios.post('/api/decision-copilot/report', analysis, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'decision-report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF download error:', error.response || error.message || error);
      const msg = error.response?.data?.error || 'Failed to download PDF';
      toast.error(msg);
    }
  };

  // remove old JSON download; we now use PDF report only
  // const handleDownloadDecisionPath = () => {
  //   if (!analysis?.decisionTree) return;
  //   try {
  //     const dataStr = JSON.stringify(analysis.decisionTree, null, 2);
  //     const blob = new Blob([dataStr], { type: 'application/json' });
  //     const url = window.URL.createObjectURL(blob);
  //     const link = document.createElement('a');
  //     link.href = url;
  //     link.setAttribute('download', 'decision-path.json');
  //     document.body.appendChild(link);
  //     link.click();
  //     link.remove();
  //     window.URL.revokeObjectURL(url);
  //     toast.success('Decision path downloaded');
  //   } catch (err) {
  //     console.error('download error', err);
  //     toast.error('Unable to download path');
  //   }
  // };

  const getScoreColor = (score) => {
    if (score >= 7) return 'success';
    if (score >= 4) return 'warning';
    return 'danger';
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 70) return 'success';
    if (confidence >= 40) return 'warning';
    return 'danger';
  };

  const getSeverityColor = (severity) => {
    if (severity === 'high') return 'danger';
    if (severity === 'medium') return 'warning';
    return 'info';
  };

  const getChartData = () => {
    if (!analysis) return null;
    
    const barData = {
      labels: analysis.scoredOptions?.map(o => o.optionLabel) || [],
      datasets: [
        {
          label: 'Score',
          data: analysis.scoredOptions?.map(o => o.score) || [],
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        },
        {
          label: 'Risk',
          data: analysis.scoredOptions?.map(o => o.risk) || [],
          backgroundColor: 'rgba(255, 99, 132, 0.7)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }
      ]
    };

    const prosData = {
      labels: analysis.argumentsByOption?.filter(o => o.optionId !== '__general__').map(o => o.optionLabel) || [],
      datasets: [
        {
          data: analysis.argumentsByOption?.filter(o => o.optionId !== '__general__').map(o => o.pros?.length || 0) || [],
          backgroundColor: ['rgba(75, 192, 192, 0.7)', 'rgba(54, 162, 235, 0.7)', 'rgba(255, 206, 86, 0.7)'],
          borderColor: ['rgba(75, 192, 192, 1)', 'rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)'],
          borderWidth: 1
        }
      ]
    };

    const consData = {
      labels: analysis.argumentsByOption?.filter(o => o.optionId !== '__general__').map(o => o.optionLabel) || [],
      datasets: [
        {
          data: analysis.argumentsByOption?.filter(o => o.optionId !== '__general__').map(o => o.cons?.length || 0) || [],
          backgroundColor: ['rgba(255, 99, 132, 0.7)', 'rgba(255, 159, 64, 0.7)', 'rgba(153, 102, 255, 0.7)'],
          borderColor: ['rgba(255, 99, 132, 1)', 'rgba(255, 159, 64, 1)', 'rgba(153, 102, 255, 1)'],
          borderWidth: 1
        }
      ]
    };

    return { barData, prosData, consData };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' }
    }
  };

  const chartData = getChartData();

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col className="text-center">
          <h4 className="fw-bold" style={{ 
  borderBottom: '3px solid black', 
  display: 'inline-block', 
  paddingBottom: '4px' 
}}>
  Drishti: Decision Copilot
</h4>
          <p className="text-muted">Make better decisions with AI-powered analysis, bias detection, and risk simulation</p>
        </Col>
      </Row>

      <Row>
        <Col lg={12}>
          <Card className="shadow-sm border-0 mb-4" style={{ borderRadius: '15px' }}>
            <Card.Header className="bg-white border-0 py-3">
              <h6 className="mb-0 fw-bold">Decision Input</h6>
            </Card.Header>
            <Card.Body>
              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">Decision Title</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        name="title"
                        placeholder="e.g., Choose safety stock strategy for track parts"
                        value={formData.title}
                        onChange={handleInputChange}
                        style={{ borderRadius: '10px', resize: 'none' }}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">Railway Context & Constraints</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        name="context"
                        placeholder="What railway corridor or depot is in scope? Any constraints on safety, budget, or lead times?"
                        value={formData.context}
                        onChange={handleInputChange}
                        style={{ borderRadius: '10px', resize: 'none' }}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <Form.Label className="fw-semibold mb-0">Options</Form.Label>
                        <Button variant="dark" size="sm" onClick={addOption} style={{ borderRadius: '20px' }} onMouseEnter={(e) => e.target.style.backgroundColor = ''} onMouseLeave={(e) => e.target.style.backgroundColor = ''}>
                          <FaPlus className="me-1" /> Add Option
                        </Button>
                      </div>
                      {options.map((option, idx) => (
                        <div key={option.id} className="d-flex gap-2 mb-2">
                          <Form.Control
                            type="text"
                            placeholder={`Option ${idx + 1}`}
                            value={option.label}
                            onChange={(e) => handleOptionChange(option.id, e.target.value)}
                            style={{ borderRadius: '10px' }}
                          />
                          <Button variant="light" size="sm" onClick={() => removeOption(option.id)} className="border">
                            <FaTrash />
                          </Button>
                        </div>
                      ))}
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Arguments & Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={5}
                    name="notes"
                    placeholder="+ Option A: Lower safety stock (reduces working capital)
- Option A: Higher risk of stock-outs during emergencies
+ Option B: Higher safety stock plus weekend replenishment
- Option B: More capital tied up in inventory"
                    value={formData.notes}
                    onChange={handleInputChange}
                    style={{ borderRadius: '10px', resize: 'none' }}
                  />
                  <Form.Text className="text-muted">
                    Prefix lines with + for pros, - for cons
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <div className="d-flex gap-2 align-items-center">
                    <div style={{ border: '2px solid #333', padding: '8px', borderRadius: '5px' }}>
                      <Form.Check
                        type="checkbox"
                        label="Treat first option as currently preferred"
                        checked={formData.preferredOptionId === `opt-${options[0]?.id}`}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          preferredOptionId: e.target.checked ? `opt-${options[0]?.id}` : null
                        }))}
                      />
                    </div>
                    <Button
                      variant="success"
                      className="py-2 fw-semibold"
                      onClick={handleAnalyze}
                      disabled={loading}
                      style={{ borderRadius: '10px', backgroundColor: '#90EE90', borderColor: '#90EE90', color: '#000' }}
                    >
                      {loading ? (
                        <>
                          <FaSync className="me-2 spin" /> Analyzing...
                        </>
                      ) : (
                        <>
                          <FaPlay className="me-2" /> Run Decision Analysis
                        </>
                      )}
                    </Button>
                  </div>
                </Form.Group>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {!analysis ? (
        <Card className="shadow-sm border-0 text-center py-5" style={{ borderRadius: '15px' }}>
          <Card.Body>
            <FaChartBar className="text-muted mb-3" style={{ fontSize: '4rem' }} />
            <h5 className="text-muted">Enter a decision and click analyze to see results</h5>
            <p className="text-muted small">The AI will analyze your options, detect biases, and provide recommendations</p>
          </Card.Body>
        </Card>
      ) : (
        <>
          {/* Decision Suggestion */}
          <Card className="shadow-sm border-0 mb-4" style={{ borderRadius: '15px' }}>
            <Card.Header className="bg-white border-0 py-3">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0 fw-bold">
                  <FaLightbulb className="me-2 text-warning" />Recommended Decision
                </h6>
                {analysis.suggestedDecision && (
                  <Badge bg={getConfidenceColor(analysis.suggestedDecision.confidence * 100)}>
                    {Math.round(analysis.suggestedDecision.confidence * 100)}% Confidence
                  </Badge>
                )}
              </div>
            </Card.Header>
            <Card.Body>
              {analysis.suggestedDecision ? (
                <div>
                  <h4 className="fw-bold text-primary">{analysis.suggestedDecision.optionLabel}</h4>
                  <p className="text-muted mb-0">
                    Based on the captured arguments, this option has the strongest pros-to-cons ratio 
                    and acceptable risk profile.
                  </p>
                </div>
              ) : (
                <p className="text-muted mb-0">Run analysis to see recommendations</p>
              )}
            </Card.Body>
          </Card>

          {/* Statistical Graphs */}
          <Row className="mb-4">
            <Col md={4}>
              <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '15px' }}>
                <Card.Header className="bg-white border-0 py-3">
                  <h6 className="mb-0 fw-bold" style={{ textDecoration: 'underline' }}>
                    <FaChartBar className="me-2" />Score vs Risk Analysis
                  </h6>
                </Card.Header>
                <Card.Body style={{ height: '250px' }}>
                  <Bar data={chartData?.barData} options={{...chartOptions, maintainAspectRatio: false}} />
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '15px' }}>
                <Card.Header className="bg-white border-0 py-3">
                  <h6 className="mb-0 fw-bold text-success" style={{ textDecoration: 'underline' }}>
                    <FaCheck className="me-2" />Pros Distribution
                  </h6>
                </Card.Header>
                <Card.Body style={{ height: '250px' }}>
                  <Doughnut data={chartData?.prosData} options={{...chartOptions, maintainAspectRatio: false}} />
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '15px' }}>
                <Card.Header className="bg-white border-0 py-3">
                  <h6 className="mb-0 fw-bold text-danger" style={{ textDecoration: 'underline' }}>
                    <FaTimes className="me-2" />Cons Distribution
                  </h6>
                </Card.Header>
                <Card.Body style={{ height: '250px' }}>
                  <Doughnut data={chartData?.consData} options={{...chartOptions, maintainAspectRatio: false}} />
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Options Comparison */}
          <Card className="shadow-sm border-0 mb-4" style={{ borderRadius: '15px' }}>
            <Card.Header className="bg-white border-0 py-3">
              <h6 className="mb-0 fw-bold" style={{ textDecoration: 'underline' }}>
                <FaChartBar className="me-2" />Options Analysis
              </h6>
            </Card.Header>
            <Card.Body>
              <Table responsive hover className="mb-0">
                <thead>
                  <tr>
                    <th>Option</th>
                    <th>Score</th>
                    <th>Risk</th>
                    <th>Pros</th>
                    <th>Cons</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.scoredOptions?.map((opt, idx) => (
                    <tr key={idx}>
                      <td className="fw-semibold">{opt.optionLabel}</td>
                      <td>
                        <ProgressBar 
                          now={opt.score * 10} 
                          variant={getScoreColor(opt.score)}
                          style={{ height: '8px', borderRadius: '4px', width: '60px' }}
                        />
                        <small>{opt.score.toFixed(1)}</small>
                      </td>
                      <td>
                        <Badge bg={opt.risk > 5 ? 'danger' : opt.risk > 2 ? 'warning' : 'success'}>
                          {opt.risk.toFixed(1)}
                        </Badge>
                      </td>
                      <td>
                        {analysis.argumentsByOption?.find(a => a.optionId === opt.optionId)?.pros.length || 0}
                      </td>
                      <td>
                        {analysis.argumentsByOption?.find(a => a.optionId === opt.optionId)?.cons.length || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          {/* Pros & Cons Matrix */}
          <Row className="mb-4">
            <Col md={6}>
              <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '15px' }}>
                <Card.Header className="border-0 py-3" style={{ backgroundColor: '#e8f5e9' }}>
                  <h6 className="mb-0 fw-bold text-success" style={{ textDecoration: 'underline' }}>
                    <FaCheck className="me-2" />Pros by Option
                  </h6>
                </Card.Header>
                <Card.Body className="py-2" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {analysis.argumentsByOption?.filter(o => o.optionId !== '__general__').map((arg, idx) => (
                    <div key={idx} className="mb-3">
                      <small className="fw-bold text-success">{arg.optionLabel}</small>
                      <ul className="mb-0 ps-3" style={{ fontSize: '0.85rem' }}>
                        {arg.pros?.slice(0, 3).map((pro, pIdx) => (
                          <li key={pIdx} className="text-muted">{pro.replace(/^\+\s*/, '')}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '15px' }}>
                <Card.Header className="border-0 py-3" style={{ backgroundColor: '#ffebee' }}>
                  <h6 className="mb-0 fw-bold text-danger" style={{ textDecoration: 'underline' }}>
                    <FaTimes className="me-2" />Cons by Option
                  </h6>
                </Card.Header>
                <Card.Body className="py-2" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {analysis.argumentsByOption?.filter(o => o.optionId !== '__general__').map((arg, idx) => (
                    <div key={idx} className="mb-3">
                      <small className="fw-bold text-danger">{arg.optionLabel}</small>
                      <ul className="mb-0 ps-3" style={{ fontSize: '0.85rem' }}>
                        {arg.cons?.slice(0, 3).map((con, cIdx) => (
                          <li key={cIdx} className="text-muted">{con.replace(/^-\s*/, '')}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Bias Detection */}
          <Card className="shadow-sm border-0 mb-4" style={{ borderRadius: '15px' }}>
            <Card.Header className="bg-light border-0 py-3">
              <h6 className="mb-0 fw-bold" style={{ textDecoration: 'underline' }}>
                <FaExclamationTriangle className="me-2 text-warning" />Bias Detection
              </h6>
            </Card.Header>
            <Card.Body>
              {analysis.biases && analysis.biases.length > 0 ? (
                <Row>
                  {analysis.biases.map((bias, idx) => (
                    <Col md={6} key={idx} className="mb-2">
                      <Alert variant={bias.severity === 'high' ? 'danger' : 'warning'} className="mb-2 py-2">
                        <div className="d-flex justify-content-between">
                          <strong>{bias.type}</strong>
                          <Badge bg={getSeverityColor(bias.severity)}>{bias.severity}</Badge>
                        </div>
                        <small className="d-block mt-1">{bias.details}</small>
                      </Alert>
                    </Col>
                  ))}
                </Row>
              ) : (
                <p className="text-muted mb-0">No strong bias patterns detected in your notes.</p>
              )}
            </Card.Body>
          </Card>

          {/* Risk Simulation section removed as requested */}

          {/* Financial Scenario Analysis */}
          <Card className="shadow-sm border-0 mb-4" style={{ borderRadius: '15px' }}>
            <Card.Header className="bg-light border-0 py-3">
              <h6 className="mb-0 fw-bold">
                <FaMoneyBillWave className="me-2 text-success" />Financial Scenario Analysis
              </h6>
            </Card.Header>
            <Card.Body>
              {analysis.profitForecast && analysis.profitForecast.length > 0 ? (
                <Row>
                  {analysis.profitForecast.map((scenario, idx) => (
                    <Col md={4} key={idx}>
                      <Card className="border-0 bg-light mb-2" style={{ borderRadius: '10px' }}>
                        <Card.Body className="py-2">
                          <small className="fw-bold d-block mb-2">{scenario.label} Case</small>
                          {scenario.options?.map((opt, oIdx) => (
                            <div key={oIdx} className="d-flex justify-content-between mb-1">
                              <small className="text-muted">{opt.optionLabel}</small>
                              <small className="fw-semibold text-success">₹{Math.round(opt.projectedProfit).toLocaleString()}</small>
                            </div>
                          ))}
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              ) : (
                <p className="text-muted mb-0">Add more context to see financial projections</p>
              )}
            </Card.Body>
          </Card>

          {/* Monte Carlo Simulation */}
          {analysis.monteCarloSummary && (
            <Card className="shadow-sm border-0 mb-4" style={{ borderRadius: '15px' }}>
              <Card.Header className="bg-light border-0 py-3">
                <h6 className="mb-0 fw-bold">
                  <FaBullseye className="me-2 text-primary" />Monte Carlo Simulation
                  <Badge bg="secondary" className="ms-2">500 iterations</Badge>
                </h6>
              </Card.Header>
              <Card.Body>
                <Row className="align-items-center">
                  <Col md={6}>
                    <h5 className="mb-0">{analysis.monteCarloSummary.optionLabel}</h5>
                    <p className="text-muted small mb-0">Success Rate: {(analysis.monteCarloSummary.successProbability * 100).toFixed(1)}%</p>
                  </Col>
                  <Col md={6}>
                    <div className="d-flex justify-content-between mb-1">
                      <small className="text-danger">P5 (Worst): {analysis.monteCarloSummary.p5?.toFixed(2)}</small>
                      <small className="text-warning">P50: {analysis.monteCarloSummary.p50?.toFixed(2)}</small>
                      <small className="text-success">P95 (Best): {analysis.monteCarloSummary.p95?.toFixed(2)}</small>
                    </div>
                    <ProgressBar>
                      <ProgressBar variant="danger" now={10} />
                      <ProgressBar variant="warning" now={40} />
                      <ProgressBar variant="success" now={50} />
                    </ProgressBar>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}

          {/* Decision Tree */}
          {analysis.decisionTree && (
            <Card className="shadow-sm border-0 mb-4" style={{ borderRadius: '15px' }}>
              <Card.Header className="bg-light border-0 py-3">
                <h6 className="mb-0 fw-bold">
                  <FaArrowRight className="me-2" style={{ color: '#6f42c1' }} />Decision Path
                </h6>
              </Card.Header>
              <Card.Body>
                <h6 className="fw-bold">{analysis.decisionTree.title}</h6>
                <p className="text-muted small">{analysis.decisionTree.description}</p>
                {analysis.decisionTree.steps?.map((step, idx) => (
                  <div key={idx} className="d-flex align-items-start mb-2">
                    <Badge bg="light" text="dark" className="me-2">{idx + 1}</Badge>
                    <div>
                      <small className="fw-semibold d-block">{step.question}</small>
                      <small className="text-muted">{step.rule}</small>
                    </div>
                  </div>
                ))}

              </Card.Body>
            </Card>
          )}

          {/* report download button centered below card */}
          {analysis && (
            <div className="text-center mb-4">
              <Button
                variant="success"
                size="md"
                onClick={handleDownloadPDF}
                style={{ borderRadius: '10px' }}
              >
                <FaDownload className="me-2" /> Download Report
              </Button>
            </div>
          )}
        </>
      )}

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Container>
  );
};

export default DecisionCopilot;