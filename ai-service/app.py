from flask import Flask, request, jsonify
import os
from datetime import datetime

try:
    from pymongo import MongoClient
except ImportError:
    MongoClient = None

app = Flask(__name__)


def get_mongo_collection():
    """Return a MongoDB collection for storing decision sessions, if configured."""
    mongo_uri = os.environ.get("MONGO_URI")
    mongo_db = os.environ.get("MONGO_DB", "railway_decisions")
    mongo_collection = os.environ.get("MONGO_COLLECTION", "decision_copilot_sessions")

    if not mongo_uri or MongoClient is None:
        return None

    try:
        client = MongoClient(mongo_uri)
        db = client[mongo_db]
        return db[mongo_collection]
    except Exception:
        # Fail gracefully – the core AI logic should still work even if Mongo is unavailable
        return None


# A simple rule-based AI for anomaly detection in inspections
def analyze_inspection(inspection_data):
    """
    Analyzes inspection data to identify anomalies.
    Returns a dictionary with an anomaly score and details.
    """
    score = 0
    reasons = []

    # Rule 1: Overall result is 'fail'
    if inspection_data.get('overallResult') == 'fail':
        score += 50
        reasons.append("Inspection result is 'fail'.")

    # Rule 2: Specific test results are 'fail'
    measurements = inspection_data.get('measurements', {})
    for key, value in measurements.items():
        if isinstance(value, dict) and value.get('result') == 'fail':
            score += 10
            reasons.append(f"Measurement '{key}' failed.")

    # Rule 3: Keywords in notes indicating potential issues
    notes = inspection_data.get('notes', '').lower()
    anomaly_keywords = ['crack', 'rust', 'defect', 'deformed', 'worn', 'corrosion', 'damage']
    for keyword in anomaly_keywords:
        if keyword in notes:
            score += 20
            reasons.append(f"Keyword '{keyword}' found in notes.")

    # Normalize score (cap at 100)
    score = min(score, 100)

    is_anomalous = score > 40  # Anomaly threshold

    return {
        'is_anomalous': is_anomalous,
        'anomaly_score': score,
        'details': reasons if is_anomalous else ["No significant anomalies detected."]
    }


def detect_biases(context_text, options):
    """Very lightweight heuristic bias detector based on keywords and structure."""
    text = (context_text or "").lower()
    biases = []

    sunk_cost_keywords = ["already invested", "spent so much", "cannot turn back", "too late to change"]
    confirmation_keywords = ["we know it works", "always done it this way", "no need to explore"]
    recency_keywords = ["recent incident", "last failure", "yesterday's issue"]
    authority_keywords = ["boss said", "senior said", "management wants"]

    if any(k in text for k in sunk_cost_keywords):
        biases.append({
            "type": "sunk_cost_fallacy",
            "description": "Decision seems influenced by past investment instead of future value.",
            "mitigation": "Re-evaluate options based on future safety, cost, and performance only."
        })

    if any(k in text for k in confirmation_keywords):
        biases.append({
            "type": "confirmation_bias",
            "description": "Discussion may favor evidence that supports an existing belief.",
            "mitigation": "Explicitly list counter-arguments and risks for the preferred option."
        })

    if any(k in text for k in recency_keywords):
        biases.append({
            "type": "recency_bias",
            "description": "Recent incidents may be overweighted compared to long-term data.",
            "mitigation": "Compare with historical inspection and failure data over a longer window."
        })

    if any(k in text for k in authority_keywords):
        biases.append({
            "type": "authority_bias",
            "description": "Decision may lean too heavily on authority figures instead of data.",
            "mitigation": "Validate the decision against objective inspection metrics and risk scores."
        })

    if len(options) <= 1:
        biases.append({
            "type": "limited_options",
            "description": "Only one serious option considered.",
            "mitigation": "Generate at least one alternative option for comparison."
        })

    return biases


def build_pros_cons_matrix(options):
    """Normalize options into a pros/cons matrix structure."""
    matrix = []
    for opt in options:
        matrix.append({
            "name": opt.get("name") or "Option",
            "pros": [p.strip() for p in (opt.get("pros") or "").split("\n") if p.strip()],
            "cons": [c.strip() for c in (opt.get("cons") or "").split("\n") if c.strip()],
            "risk_level": opt.get("risk_level", "medium"),
            "cost_impact": opt.get("cost_impact", "medium"),
            "time_impact": opt.get("time_impact", "medium")
        })
    return matrix


def build_decision_tree(title, options):
    """Return a simple decision tree-like structure consumable by the UI."""
    return {
        "root": {
            "label": title or "Maintenance decision",
            "children": [
                {
                    "label": opt.get("name") or f"Option {idx + 1}",
                    "children": [
                        {"label": "Pros", "children": [{"label": p} for p in opt.get("pros", [])]},
                        {"label": "Cons", "children": [{"label": c} for c in opt.get("cons", [])]},
                    ]
                }
                for idx, opt in enumerate(options)
            ]
        }
    }


def score_option(option):
    """Compute a simple option score and risk profile for ranking."""
    pros_count = len(option.get("pros", []))
    cons_count = len(option.get("cons", []))

    base_score = max(pros_count - cons_count, -3) + 3  # 0..6

    risk_map = {"low": 1.0, "medium": 0.7, "high": 0.4}
    level = str(option.get("risk_level", "medium")).lower()
    risk_factor = risk_map.get(level, 0.7)

    final_score = base_score * risk_factor

    # Derived risk metrics for charting
    best_case = round(final_score + risk_factor * 2, 2)
    worst_case = round(max(final_score - risk_factor * 2, 0), 2)
    expected_case = round(final_score, 2)

    return {
        "score": round(final_score, 2),
        "risk_profile": {
            "best_case": best_case,
            "worst_case": worst_case,
            "expected": expected_case
        }
    }


def analyze_decision(payload):
    """Core brain of the Decision Copilot."""
    title = payload.get("title") or "Maintenance decision"
    context = payload.get("context") or ""
    options_input = payload.get("options") or []

    matrix = build_pros_cons_matrix(options_input)

    # Score each option
    scored_options = []
    total_score = 0.0
    for opt in matrix:
        scoring = score_option(opt)
        scored_option = {
            "name": opt["name"],
            "pros": opt["pros"],
            "cons": opt["cons"],
            "risk_level": opt["risk_level"],
            "cost_impact": opt["cost_impact"],
            "time_impact": opt["time_impact"],
            "score": scoring["score"],
            "risk_profile": scoring["risk_profile"]
        }
        scored_options.append(scored_option)
        total_score += scoring["score"]

    # Choose best option
    recommended = max(scored_options, key=lambda o: o["score"], default=None) if scored_options else None

    # Confidence score based on spread and number of options
    confidence = 0.0
    if recommended and len(scored_options) > 0 and total_score > 0:
        confidence = min(0.99, max(0.4, recommended["score"] / (total_score + 1e-6)))

    biases = detect_biases(context, matrix)

    missing_perspectives = []
    if "safety" not in context.lower():
        missing_perspectives.append("Safety impact on track workers and passengers is not explicitly discussed.")
    if "vendor" not in context.lower():
        missing_perspectives.append("Vendor reliability and SLA performance are not clearly considered.")
    if "downtime" not in context.lower():
        missing_perspectives.append("Operational downtime during maintenance is not quantified.")

    decision_tree = build_decision_tree(title, matrix)

    analysis = {
        "title": title,
        "context": context,
        "options": scored_options,
        "pros_cons_matrix": matrix,
        "biases": biases,
        "missing_perspectives": missing_perspectives,
        "decision_tree": decision_tree,
        "recommended_option": recommended,
        "confidence": round(confidence, 2),
        "created_at": datetime.utcnow().isoformat() + "Z"
    }

    # Persist to MongoDB if available
    collection = get_mongo_collection()
    if collection is not None:
        try:
            collection.insert_one({
                **analysis,
                "_created_at": datetime.utcnow()
            })
        except Exception:
            # Do not block the main flow on Mongo errors
            pass

    return analysis


@app.route('/analyze', methods=['POST'])
def analyze():
    if not request.json:
        return jsonify({"error": "Invalid input, JSON required"}), 400

    try:
        inspection_data = request.json
        analysis_result = analyze_inspection(inspection_data)
        return jsonify(analysis_result)
    except Exception as e:
        return jsonify({"error": "An error occurred during analysis", "details": str(e)}), 500


@app.route('/decision-copilot', methods=['POST'])
def decision_copilot():
    """Endpoint used by the maintenance team's Decision Copilot UI."""
    if not request.json:
        return jsonify({"success": False, "message": "Invalid input, JSON required"}), 400

    try:
        payload = request.json
        result = analyze_decision(payload)
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({
            "success": False,
            "message": "An error occurred during decision analysis",
            "error": str(e)
        }), 500


@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "OK", "service": "AI-Service"})


if __name__ == '__main__':
    # Default to port 5001 to match AI_SERVICE_URL in the main Node server config
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
