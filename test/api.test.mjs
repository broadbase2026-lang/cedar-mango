import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import axios from 'axios';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

describe('Broadbase Production QA Validation Suite', () => {
  let tokens = { solo: null, growth: null, enterprise: null, journalist: null };
  let testAssetId = '123e4567-e89b-12d3-a456-426614174000'; // Example UUID

  before(async () => {
    // In a real environment, seed users and fetch actual JWT tokens here
    tokens = {
      solo: 'MOCK_SOLO_JWT',
      growth: 'MOCK_GROWTH_JWT',
      enterprise: 'MOCK_ENTERPRISE_JWT',
      journalist: 'MOCK_JOURNALIST_JWT'
    };
  });

  // ==========================================
  // 1. BRAND FLOWS & PLAN BOUNDARIES
  // ==========================================
  describe('Brand Flows: Tiered Limits & Security', () => {
    
    it('Solo Plan: Should block embargo utilization with a 403 status', async () => {
      try {
        await axios.post(`${BASE_URL}/press-releases/publish`, {
          title: 'Solo Embargo Test',
          embargo_until: new Date(Date.now() + 3600000).toISOString() // 1 hour in future
        }, { headers: { Authorization: `Bearer ${tokens.solo}` } });
        
        assert.fail('Should have failed with 403');
      } catch (error) {
        assert.strictEqual(error.response.status, 403, 'Should return 403 Forbidden');
      }
    });

    it('Solo Plan: Should block calling /api/ai with a 403 status', async () => {
      try {
        await axios.post(`${BASE_URL}/ai`, {}, {
          headers: { Authorization: `Bearer ${tokens.solo}` }
        });
        assert.fail('Should have failed with 403');
      } catch (error) {
        assert.strictEqual(error.response.status, 403);
      }
    });

    it('Analytics: Should block CSV export for Growth and Solo users', async () => {
      for (const tier of ['solo', 'growth']) {
        try {
          await axios.get(`${BASE_URL}/analytics/export-csv`, { // Map to your actual CSV route
            headers: { Authorization: `Bearer ${tokens[tier]}` }
          });
          assert.fail(`Should have blocked ${tier} tier`);
        } catch (error) {
          assert.strictEqual(error.response.status, 403);
        }
      }
    });
  });

  // ==========================================
  // 2. FREE TRIAL LIMIT ENFORCEMENT
  // ==========================================
  describe('Free Trial Limit Gatekeeping', () => {
    it('Should block publishing a 2nd release directly via the API', async () => {
      try {
        // Simulating user who has trial_releases_used = 1 trying to publish again
        await axios.post(`${BASE_URL}/press-releases/publish`, {
          title: 'Bypassing UI to upload 2nd press release',
          content: '...'
        }, { headers: { Authorization: `Bearer ${tokens.solo}` } }); // Assuming trial acts as Solo/Starter
        
        assert.fail('API allowed secondary trial publish');
      } catch (error) {
        assert.strictEqual(error.response.status, 400, 'Should return 400 Bad Request / Trigger fail');
        assert.strictEqual(error.response.data.error, 'upgrade_required');
        assert.strictEqual(error.response.data.data.redirectTo, '/pricing?reason=release-limit');
      }
    });
  });

  // ==========================================
  // 3. EMBARGOED ASSET DELIVERY SYSTEM (PHASE 6)
  // ==========================================
  describe('Secure Embargoed Asset Delivery Flow', () => {
    let secureDownloadToken;

    it('POST /api/assets/request-token -> Should reject unauthenticated requests with 401', async () => {
      try {
        await axios.post(`${BASE_URL}/assets/request-token`, { assetId: testAssetId });
        assert.fail('Allowed unauthenticated token request');
      } catch (error) {
        assert.strictEqual(error.response.status, 401);
      }
    });

    it('POST /api/assets/request-token -> Should reject malformed JSON UUIDs with 400', async () => {
      try {
        await axios.post(`${BASE_URL}/assets/request-token`, 
          { assetId: 'not-a-valid-uuid' },
          { headers: { Authorization: `Bearer ${tokens.journalist}` } }
        );
        assert.fail('Allowed invalid UUID formatting');
      } catch (error) {
        assert.strictEqual(error.response.status, 400);
        assert.strictEqual(error.response.data.error, 'Invalid request body');
      }
    });

    it('GET /api/assets/download -> Single-Use Semantics Verification', async () => {
      // Mocking a successful token retrieval (simulate the UUID token returned in step 1)
      secureDownloadToken = 'abc123e4-e89b-12d3-a456-426614174000'; 

      // Note: To test this safely against a real backend, ensure your test harness 
      // generates a live token immediately before executing these twin requests.
      
      try {
        // First Download Attempt -> Expected: 200 Stream
        const firstCall = await axios.get(`${BASE_URL}/assets/download?token=${secureDownloadToken}`, {
          headers: { Authorization: `Bearer ${tokens.journalist}` }
        });
        assert.strictEqual(firstCall.status, 200);
        assert.strictEqual(firstCall.headers['cache-control'], 'no-store, no-cache, must-revalidate');

        // Second Immediate Download Attempt -> Expected: 403 (Token Consumed)
        await axios.get(`${BASE_URL}/assets/download?token=${secureDownloadToken}`, {
          headers: { Authorization: `Bearer ${tokens.journalist}` }
        });
        assert.fail('Token was allowed to be used twice');
      } catch (error) {
        if (error.name === 'AssertionError') throw error;
        assert.strictEqual(error.response.status, 403, 'Subsequent attempts must return 403 Access Denied');
      }
    });
  });
});