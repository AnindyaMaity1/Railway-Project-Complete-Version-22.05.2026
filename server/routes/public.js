const express = require('express');
const axios = require('axios');
const { TrackFitting, Vendor, Inspection } = require('../models_mongo');
const moment = require('moment');

const router = express.Router();

// Public endpoint to get QR code details by database ID
router.get('/item/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const trackFitting = await TrackFitting.findById(id).lean();

    if (!trackFitting) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>QR Code Details Not Found</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                body { background-color: #f8f9fa; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                .card { border: none; border-radius: 1rem; box-shadow: 0 0.5rem 1rem rgba(0,0,0,0.1); }
                .header-bg { background-color: #dc3545; color: white; border-top-left-radius: 1rem; border-top-right-radius: 1rem; padding: 1.5rem; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="row justify-content-center">
                    <div class="col-md-8 col-lg-6">
                        <div class="card">
                            <div class="header-bg text-center">
                                <h3 class="mb-0">QR Code Details</h3>
                            </div>
                            <div class="card-body p-4 text-center">
                                <h4 class="card-title text-danger mb-3">Details Not Found</h4>
                                <p class="card-text">The track fitting details for ID <strong>${id}</strong> could not be found.</p>
                                <p class="card-text">Please ensure the QR code is valid and try again, or contact support.</p>
                                <a href="/" class="btn btn-outline-secondary mt-3">Go to Home</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
      `);
    }

    const vendor = trackFitting.vendorId ? await Vendor.findById(trackFitting.vendorId).lean() : null;
    const recentInspections = await Inspection.find({ trackFittingId: id })
      .sort({ actualDate: -1, scheduledDate: -1 })
      .limit(3)
      .lean();

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Track Fitting Details - ${trackFitting.serialNumber}</title>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
          <style>
              body { background-color: #f8f9fa; }
              .container { margin-top: 30px; margin-bottom: 30px; }
              .card { border: none; border-radius: 1rem; box-shadow: 0 0.5rem 1rem rgba(0,0,0,0.1); }
              .header-bg { background-color: #0d6efd; color: white; border-top-left-radius: 1rem; border-top-right-radius: 1rem; padding: 1.5rem; }
              .section-title { border-bottom: 1px solid #eee; padding-bottom: 0.5rem; margin-bottom: 1rem; color: #0d6efd; }
              .badge-status-success { background-color: #198754; }
              .badge-status-danger { background-color: #dc3545; }
              .badge-status-warning { background-color: #ffc107; color: #000; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="card">
                  <div class="header-bg text-center">
                      <h3 class="mb-0">Track Fitting Details</h3>
                      <p class="lead mb-0">${(trackFitting.itemType || '').replace(/_/g, ' ').toUpperCase()} - ${trackFitting.serialNumber}</p>
                  </div>
                  <div class="card-body p-4">
                      <h5 class="section-title">Basic Information</h5>
                      <div class="row mb-3">
                          <div class="col-md-6">
                              <p><strong>Database ID:</strong> ${trackFitting._id}</p>
                              <p><strong>Item Type:</strong> ${(trackFitting.itemType || '').replace(/_/g, ' ').toUpperCase()}</p>
                              <p><strong>Serial Number:</strong> ${trackFitting.serialNumber}</p>
                          </div>
                          <div class="col-md-6">
                              <p><strong>Batch Number:</strong> ${trackFitting.batchNumber || 'N/A'}</p>
                              <p><strong>Lot Number:</strong> ${trackFitting.lotNumber || 'N/A'}</p>
                              <p><strong>Status:</strong> <span class="badge bg-primary">${(trackFitting.status || '').toUpperCase()}</span></p>
                          </div>
                      </div>

                      <h5 class="section-title mt-4">Specifications</h5>
                      <div class="row mb-3">
                          <div class="col-md-6">
                              <p><strong>Material:</strong> ${trackFitting.material || 'N/A'}</p>
                              <p><strong>Weight:</strong> ${trackFitting.weight || 0} kg</p>
                          </div>
                          <div class="col-md-6">
                              <p><strong>Grade:</strong> ${trackFitting.grade || 'N/A'}</p>
                              <p><strong>Standard:</strong> ${trackFitting.standard || 'N/A'}</p>
                          </div>
                      </div>

                      <h5 class="section-title mt-4">Manufacturing Details</h5>
                      <div class="row mb-3">
                          <div class="col-md-6">
                              <p><strong>Date:</strong> ${trackFitting.manufacturingDate ? moment(trackFitting.manufacturingDate).format('YYYY-MM-DD') : 'N/A'}</p>
                              <p><strong>Location:</strong> ${trackFitting.manufacturingLocation || 'N/A'}</p>
                          </div>
                          <div class="col-md-6">
                              <p><strong>Machine ID:</strong> ${trackFitting.machineId || 'N/A'}</p>
                          </div>
                      </div>

                      <h5 class="section-title mt-4">Vendor Information</h5>
                      ${vendor ? `
                      <div class="row mb-3">
                          <div class="col-md-6">
                              <p><strong>Company:</strong> ${vendor.companyName}</p>
                              <p><strong>Email:</strong> ${vendor.contactEmail || 'N/A'}</p>
                          </div>
                          <div class="col-md-6">
                              <p><strong>Phone:</strong> ${vendor.contactPhone || 'N/A'}</p>
                              <p><strong>Quality Rating:</strong> ${vendor.qualityRating || 'N/A'} / 5</p>
                          </div>
                      </div>
                      ` : '<p>No vendor information available.</p>'}

                      <h5 class="section-title mt-4">Recent Inspections</h5>
                      ${recentInspections && recentInspections.length > 0 ? `
                      <ul class="list-group">
                          ${recentInspections.map(inspection => `
                              <li class="list-group-item d-flex justify-content-between align-items-center">
                                  <div>
                                      <strong>${(inspection.inspectionType || '').toUpperCase()}</strong>
                                      <small class="text-muted ms-2">On: ${inspection.actualDate ? moment(inspection.actualDate).format('YYYY-MM-DD') : (inspection.scheduledDate ? moment(inspection.scheduledDate).format('YYYY-MM-DD') : 'N/A')}</small>
                                  </div>
                                  <span class="badge ${inspection.overallResult === 'pass' ? 'badge-status-success' : 'badge-status-danger'}">
                                      ${inspection.overallResult ? inspection.overallResult.toUpperCase() : 'N/A'}
                                  </span>
                              </li>
                          `).join('')}
                      </ul>
                      ` : '<p>No recent inspections found.</p>'}

                      <div class="text-center mt-5">
                          <p class="text-muted">Data last updated: ${trackFitting.updatedAt ? moment(trackFitting.updatedAt).format('YYYY-MM-DD HH:mm:ss') : 'N/A'}</p>
                      </div>
                  </div>
              </div>
          </div>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('Error fetching public item details:', error);
    res.status(500).send('<h1>Error</h1><p>An unexpected error occurred. Please try again later.</p>');
  }
});

// Reverse geocode helper for dashboard – converts coordinates to a friendly name
router.get('/reverse-geocode', async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ success: false, message: 'lat and lon are required' });
    }

    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        format: 'json',
        lat,
        lon
      },
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'railway-track-dashboard-server'
      },
      timeout: 5000
    });

    const data = response.data || {};
    const address = data.address || {};
    const name =
      address.city ||
      address.town ||
      address.village ||
      address.suburb ||
      address.county ||
      data.display_name;

    return res.json({
      success: true,
      name: name || `${parseFloat(lat).toFixed(2)}, ${parseFloat(lon).toFixed(2)}`
    });
  } catch (error) {
    console.error('Reverse geocode error:', error.message || error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resolve location name'
    });
  }
});

const FALLBACK_STATIONS = [
  'Agra', 'Ahmedabad', 'Bengaluru', 'Bhopal', 'Chennai', 'Delhi', 'Guwahati',
  'Hyderabad', 'Howrah', 'Jaipur', 'Kolkata', 'Lucknow', 'Mumbai Central',
  'Nagpur', 'Patna', 'Pune', 'Secunderabad', 'Surat', 'Varanasi', 'Vijayawada'
];

// Station search helper – returns station suggestions for QR generator
router.get('/stations', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim().length === 0) {
      return res.json({ success: true, stations: [] });
    }

    const apiUrl = process.env.STATION_API_URL;
    const apiKey = process.env.STATION_API_KEY;

    const q = query.trim().toLowerCase();
    let names = [];

    if (apiUrl && apiKey) {
      const response = await axios.get(apiUrl, {
        params: { query },
        headers: { 'x-api-key': apiKey },
        timeout: 5000
      });

      const stations = response.data?.stations || response.data || [];
      names = stations
        .map((s) => {
          if (typeof s === 'string') return s;
          if (s.name) return s.name;
          if (s.stationName) return s.stationName;
          if (s.code && s.name) return `${s.name} (${s.code})`;
          if (s.code) return s.code;
          return null;
        })
        .filter(Boolean);
    } else {
      // Fallback to local list if no external API configured
      names = FALLBACK_STATIONS;
    }

    const filtered = names.filter((name) =>
      name.toLowerCase().startsWith(q)
    );

    return res.json({
      success: true,
      stations: filtered
    });
  } catch (error) {
    console.error('Station search error:', error.message || error);
    return res.status(500).json({
      success: false,
      stations: [],
      message: 'Failed to fetch stations'
    });
  }
});

module.exports = router;
